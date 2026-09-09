<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Services;

use App\Domains\Accounting\Enums\JournalEntrySourceType;
use App\Domains\Accounting\Enums\JournalEntryStatus;
use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Accounting\Models\JournalEntryLine;
use App\Domains\Accounting\Repositories\Contracts\JournalEntryRepositoryInterface;
use App\Domains\Core\Services\FiscalPeriodService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalService
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountService $accountService,
        private readonly FiscalPeriodService $fiscalPeriodService,
    ) {}

    /**
     * جلب القيود مفلترة ومقسمة صفحات
     *
     * @param array<string, mixed> $filters
     */
    public function listEntries(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return $this->journalEntryRepository->paginate($filters, $perPage);
    }

    /**
     * جلب قيد محدد مع تفاصيل الأسطر والحسابات
     */
    public function getEntry(int $id): JournalEntry
    {
        $entry = $this->journalEntryRepository->findById($id);

        if (!$entry) {
            throw ValidationException::withMessages([
                'journal_entry' => ["قيد اليومية غير موجود (معرف: {$id})"],
            ]);
        }

        return $entry;
    }

    /**
     * إنشاء مسودة قيد يومية (Draft)
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $lines
     */
    public function createDraft(array $data, array $lines = []): JournalEntry
    {
        return DB::transaction(function () use ($data, $lines) {
            $date = !empty($data['date']) ? (string) $data['date'] : Carbon::now()->toDateString();

            // صمام الأمان: التحقق من أن تاريخ القيد يقع ضمن فترة مالية مفتوحة
            $period = $this->fiscalPeriodService->assertDateInOpenPeriod($date);
            $data['fiscal_period_id'] = $period->id;
            $data['date'] = $date;

            $year = (int) Carbon::parse($date)->format('Y');
            if (empty($data['entry_number'])) {
                $data['entry_number'] = $this->journalEntryRepository->generateNextEntryNumber('JE', $year);
            }

            $data['status'] = JournalEntryStatus::Draft;
            $data['source_type'] = $data['source_type'] ?? JournalEntrySourceType::Manual;

            $totalDebit = '0.0000';
            $totalCredit = '0.0000';

            // معالجة وفحص الأسطر إن وجدت
            $preparedLines = [];
            foreach ($lines as $index => $line) {
                $prepared = $this->prepareAndValidateLine($line, $index);
                $totalDebit = bcadd($totalDebit, $prepared['debit'], 4);
                $totalCredit = bcadd($totalCredit, $prepared['credit'], 4);
                $preparedLines[] = $prepared;
            }

            $data['total_debit'] = $totalDebit;
            $data['total_credit'] = $totalCredit;

            $entry = $this->journalEntryRepository->create($data);

            foreach ($preparedLines as $prepared) {
                $prepared['journal_entry_id'] = $entry->id;
                JournalEntryLine::create($prepared);
            }

            return $this->getEntry($entry->id);
        });
    }

    /**
     * ترحيل القيد المحاسبي (Posting)
     * بمجرد الترحيل يصبح القيد غير قابل للتعديل أو الحذف (Immutable)
     */
    public function postEntry(int|JournalEntry $entry, ?int $userId = null): JournalEntry
    {
        return DB::transaction(function () use ($entry, $userId) {
            $journalEntry = is_int($entry) ? $this->getEntry($entry) : $entry->fresh(['lines.account']);

            if ($journalEntry->isPosted()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ["القيد رقم [{$journalEntry->entry_number}] مرحّل مسبقاً بالفعل."],
                ]);
            }

            if ($journalEntry->isReversed()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ["لا يمكن ترحيل قيد معكوس ومغلق [{$journalEntry->entry_number}]."],
                ]);
            }

            // التأكد من أن الفترة المالية ما تزال مفتوحة عند لحظة الترحيل
            $this->fiscalPeriodService->assertDateInOpenPeriod($journalEntry->date);

            // التحقق من وجود سطرين على الأقل للقيد المزدوج
            $lines = $journalEntry->lines;
            if ($lines->count() < 2) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['يجب أن يحتوي قيد اليومية على سطرين على الأقل (طرف مدين وطرف دائن).'],
                ]);
            }

            // التحقق المحاسبي الصارم من أهلية الحسابات وتوازن المدين والدائن
            $sumDebit = '0.0000';
            $sumCredit = '0.0000';

            foreach ($lines as $line) {
                // صمام أمان الحساب التحليلي Leaf Account
                $this->accountService->assertCanPost($line->account_id);

                $sumDebit = bcadd($sumDebit, (string) $line->debit, 4);
                $sumCredit = bcadd($sumCredit, (string) $line->credit, 4);
            }

            if (bccomp($sumDebit, $sumCredit, 4) !== 0) {
                throw ValidationException::withMessages([
                    'journal_entry' => [
                        "القيد المحاسبي غير متوازن: إجمالي الطرف المدين ({$sumDebit}) لا يساوي إجمالي الطرف الدائن ({$sumCredit}). الفرق: " . bcsub($sumDebit, $sumCredit, 4),
                    ],
                ]);
            }

            if (bccomp($sumDebit, '0.0000', 4) <= 0) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['لا يمكن ترحيل قيد مالي بمبلغ صفري، يجب أن تكون قيمة القيد أكبر من الصفر.'],
                ]);
            }

            // اعتماد وترحيل القيد
            $journalEntry->update([
                'status' => JournalEntryStatus::Posted,
                'total_debit' => $sumDebit,
                'total_credit' => $sumCredit,
                'posted_at' => Carbon::now(),
                'posted_by' => $userId,
            ]);

            return $journalEntry->fresh(['lines.account', 'lines.costCenter', 'branch', 'fiscalPeriod']);
        });
    }

    /**
     * إنشاء القيد وترحيله فوراً في معاملة واحدة متكاملة
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $lines
     */
    public function createAndPost(array $data, array $lines, ?int $userId = null): JournalEntry
    {
        return DB::transaction(function () use ($data, $lines, $userId) {
            $draft = $this->createDraft($data, $lines);
            return $this->postEntry($draft, $userId);
        });
    }

    /**
     * عكس قيد يومية مرحّل عبر إنشاء قيد عكسي مطابق (Reversal Entry)
     */
    public function reverseEntry(
        int|JournalEntry $entry,
        string $reason,
        ?string $reversalDate = null,
        ?int $userId = null
    ): JournalEntry {
        return DB::transaction(function () use ($entry, $reason, $reversalDate, $userId) {
            $original = is_int($entry) ? $this->getEntry($entry) : $entry->fresh(['lines.account']);

            if (!$original->isPosted()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ["لا يمكن عكس القيد [{$original->entry_number}] لأنه ليس في حالة مرحّل (حالة القيد الحالية: {$original->status->label()})."],
                ]);
            }

            if ($original->isReversed()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ["القيد [{$original->entry_number}] معكوس مسبقاً بالفعل."],
                ]);
            }

            $date = $reversalDate ?? Carbon::now()->toDateString();
            $period = $this->fiscalPeriodService->assertDateInOpenPeriod($date);
            $year = (int) Carbon::parse($date)->format('Y');

            // تجهيز أسطر القيد العكسي (عكس المدين دائناً والدائن مديناً)
            $reverseLines = [];
            foreach ($original->lines as $index => $line) {
                $reverseLines[] = [
                    'account_id' => $line->account_id,
                    'cost_center_id' => $line->cost_center_id,
                    'debit' => $line->credit,   // عكس
                    'credit' => $line->debit,   // عكس
                    'currency_id' => $line->currency_id,
                    'exchange_rate' => $line->exchange_rate,
                    'foreign_debit' => $line->foreign_credit,
                    'foreign_credit' => $line->foreign_debit,
                    'description' => "عكس سطر: " . ($line->description ?: $line->account->name_ar),
                    'line_order' => $index + 1,
                ];
            }

            // إنشاء قيد العكس
            $reversalData = [
                'entry_number' => $this->journalEntryRepository->generateNextEntryNumber('REV', $year),
                'date' => $date,
                'branch_id' => $original->branch_id,
                'fiscal_period_id' => $period->id,
                'source_type' => $original->source_type,
                'source_id' => $original->source_id,
                'source_reference' => "قيد عكسي للقيد: {$original->entry_number}",
                'reversal_of_id' => $original->id,
                'description' => "قيد عكسي للقيد [{$original->entry_number}]. سبب العكس: " . trim($reason),
                'created_by' => $userId,
            ];

            // إنشاء قيد العكس وترحيله مباشرة
            $reversalEntry = $this->createAndPost($reversalData, $reverseLines, $userId);

            // تحديث القيد الأصلي ليصبح في حالة معكوس مع ربط معرف القيد العاكس
            $original->update([
                'status' => JournalEntryStatus::Reversed,
                'reversed_by_id' => $reversalEntry->id,
            ]);

            return $reversalEntry;
        });
    }

    /**
     * تحديث مسودة قيد (مسموح فقط في حالة Draft)
     *
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>>|null $lines
     */
    public function updateDraft(int $id, array $data, ?array $lines = null): JournalEntry
    {
        return DB::transaction(function () use ($id, $data, $lines) {
            $entry = $this->getEntry($id);

            if (!$entry->isDraft()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['لا يمكن تعديل بيانات قيد يومية مرحّل أو معكوس طبقاً لقواعد النزاهة المحاسبية.'],
                ]);
            }

            if (!empty($data['date']) && $data['date'] !== $entry->date->toDateString()) {
                $period = $this->fiscalPeriodService->assertDateInOpenPeriod($data['date']);
                $data['fiscal_period_id'] = $period->id;
            }

            if ($lines !== null) {
                // حذف الأسطر القديمة وإعادة إنشائها
                $entry->lines()->delete();

                $totalDebit = '0.0000';
                $totalCredit = '0.0000';

                foreach ($lines as $index => $line) {
                    $prepared = $this->prepareAndValidateLine($line, $index);
                    $prepared['journal_entry_id'] = $entry->id;
                    JournalEntryLine::create($prepared);

                    $totalDebit = bcadd($totalDebit, $prepared['debit'], 4);
                    $totalCredit = bcadd($totalCredit, $prepared['credit'], 4);
                }

                $data['total_debit'] = $totalDebit;
                $data['total_credit'] = $totalCredit;
            }

            return $this->journalEntryRepository->update($entry, $data);
        });
    }

    /**
     * حذف مسودة قيد (مسموح فقط في حالة Draft)
     */
    public function deleteDraft(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $entry = $this->getEntry($id);

            if (!$entry->isDraft()) {
                throw ValidationException::withMessages([
                    'journal_entry' => ['لا يمكن حذف القيد المحاسبي بعد ترحيله، يمكن فقط إجراء قيد عكسي.'],
                ]);
            }

            $entry->lines()->delete();
            return $this->journalEntryRepository->delete($entry);
        });
    }

    /**
     * التحقق من سلامة سطر القيد وضبط أرقامه بدقة
     *
     * @param array<string, mixed> $line
     * @return array<string, mixed>
     */
    private function prepareAndValidateLine(array $line, int $index): array
    {
        if (empty($line['account_id'])) {
            throw ValidationException::withMessages([
                "lines.{$index}.account_id" => ["يجب اختيار الحساب المالي في السطر رقم " . ($index + 1)],
            ]);
        }

        // صمام الأمان: التأكد من أن الحساب تحليلي ومفعل
        $this->accountService->assertCanPost((int) $line['account_id']);

        $debit = isset($line['debit']) ? number_format((float) $line['debit'], 4, '.', '') : '0.0000';
        $credit = isset($line['credit']) ? number_format((float) $line['credit'], 4, '.', '') : '0.0000';

        if (bccomp($debit, '0.0000', 4) < 0 || bccomp($credit, '0.0000', 4) < 0) {
            throw ValidationException::withMessages([
                "lines.{$index}" => ["لا يُسمح بالمبالغ السالبة في أسطر القيد المحاسبي (السطر " . ($index + 1) . ")."],
            ]);
        }

        if (bccomp($debit, '0.0000', 4) > 0 && bccomp($credit, '0.0000', 4) > 0) {
            throw ValidationException::withMessages([
                "lines.{$index}" => ["لا يمكن للسطر الواحد أن يحتوي على مدين ودائن في نفس الوقت (السطر " . ($index + 1) . ")."],
            ]);
        }

        return [
            'account_id' => (int) $line['account_id'],
            'cost_center_id' => !empty($line['cost_center_id']) ? (int) $line['cost_center_id'] : null,
            'debit' => $debit,
            'credit' => $credit,
            'currency_id' => !empty($line['currency_id']) ? (int) $line['currency_id'] : null,
            'exchange_rate' => !empty($line['exchange_rate']) ? (string) $line['exchange_rate'] : '1.000000',
            'foreign_debit' => !empty($line['foreign_debit']) ? (string) $line['foreign_debit'] : null,
            'foreign_credit' => !empty($line['foreign_credit']) ? (string) $line['foreign_credit'] : null,
            'description' => $line['description'] ?? null,
            'line_order' => $line['line_order'] ?? ($index + 1),
        ];
    }
}
