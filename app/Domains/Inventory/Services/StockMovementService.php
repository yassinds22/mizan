<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Services;

use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Services\JournalService;
use App\Domains\Core\Services\FiscalPeriodService;
use App\Domains\Inventory\Enums\MovementStatus;
use App\Domains\Inventory\Enums\MovementType;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\StockMovement;
use App\Domains\Inventory\Models\StockMovementLine;
use App\Domains\Products\Models\Item;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementService
{
    public function __construct(
        private readonly StockBalanceService $stockBalanceService,
        private readonly StockLedgerService $stockLedgerService,
        private readonly JournalService $journalService,
        private readonly FiscalPeriodService $fiscalPeriodService,
    ) {}

    /**
     * استعلام حركات المخزون مع التصفية
     */
    public function listMovements(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $query = StockMovement::query()->with([
            'fromWarehouse',
            'toWarehouse',
            'branch',
            'journalEntry',
            'lines.item',
            'lines.batch',
            'lines.fromLocation',
            'lines.toLocation',
        ]);

        if (!empty($filters['movement_type']) && $filters['movement_type'] !== 'all') {
            $query->where('movement_type', $filters['movement_type']);
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['warehouse_id'])) {
            $whId = (int) $filters['warehouse_id'];
            $query->where(function ($q) use ($whId) {
                $q->where('from_warehouse_id', $whId)
                  ->orWhere('to_warehouse_id', $whId);
            });
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('movement_number', 'like', $term)
                  ->orWhere('reason', 'like', $term);
            });
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * جلب مستند حركة محدد
     */
    public function getMovement(int $id): StockMovement
    {
        return StockMovement::with([
            'fromWarehouse',
            'toWarehouse',
            'branch',
            'journalEntry.lines.account',
            'lines.item.baseUom',
            'lines.batch',
            'lines.fromLocation',
            'lines.toLocation',
        ])->findOrFail($id);
    }

    /**
     * إنشاء مسودة مستند حركة مخزون جديدة مع أسطرها
     */
    public function createMovement(array $header, array $lines): StockMovement
    {
        return DB::transaction(function () use ($header, $lines) {
            $date = $header['movement_date'] ?? Carbon::now()->toDateString();
            $year = Carbon::parse($date)->format('Y');
            $count = StockMovement::count() + 1;
            $movementNumber = sprintf('MV-%s-%04d', $year, $count);

            /** @var StockMovement $movement */
            $movement = StockMovement::create([
                'movement_number' => $movementNumber,
                'movement_type' => $header['movement_type'],
                'movement_date' => $date,
                'branch_id' => $header['branch_id'],
                'from_warehouse_id' => $header['from_warehouse_id'] ?? null,
                'to_warehouse_id' => $header['to_warehouse_id'] ?? null,
                'reason' => $header['reason'] ?? null,
                'notes' => $header['notes'] ?? null,
                'status' => MovementStatus::DRAFT,
            ]);

            foreach ($lines as $line) {
                $item = Item::findOrFail($line['item_id']);
                $qty = (float) $line['quantity'];

                // استنتاج تكلفة الوحدة من الدفعة أو الصنف
                $unitCost = isset($line['unit_cost']) && (float) $line['unit_cost'] > 0
                    ? (float) $line['unit_cost']
                    : null;

                if ($unitCost === null && !empty($line['batch_id'])) {
                    $batch = ItemBatch::find($line['batch_id']);
                    $unitCost = $batch ? (float) $batch->unit_cost : null;
                }

                if ($unitCost === null) {
                    $unitCost = (float) $item->cost_price;
                }

                $totalCost = round($qty * $unitCost, 4);

                $movement->lines()->create([
                    'item_id' => $item->id,
                    'from_location_id' => $line['from_location_id'] ?? null,
                    'to_location_id' => $line['to_location_id'] ?? null,
                    'batch_id' => $line['batch_id'] ?? null,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'total_cost' => $totalCost,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            return $movement->load(['lines.item', 'lines.batch', 'fromWarehouse', 'toWarehouse']);
        });
    }

    /**
     * ترحيل حركة المخزون ذرياً:
     * 1. فحص كفاية الأرصدة
     * 2. تحديث أرصدة المستودعات والمواقع (stock_balances)
     * 3. تسجيل سجلات دفتر الأستاذ التراكمي (stock_ledger_entries)
     * 4. إنشاء وتوليد القيد المحاسبي المتوازن (للحركات المؤثرة مالياً مثل الهدر والتسويات)
     */
    public function postMovement(int $id): StockMovement
    {
        return DB::transaction(function () use ($id) {
            /** @var StockMovement $movement */
            $movement = StockMovement::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($movement->status !== MovementStatus::DRAFT) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن ترحيل حركة مخزون ليست بحالة مسودة.'],
                ]);
            }

            $dateStr = $movement->movement_date->toDateString();
            $this->fiscalPeriodService->assertDateInOpenPeriod($dateStr);

            $movement->load(['lines.item', 'lines.batch']);

            if ($movement->lines->isEmpty()) {
                throw ValidationException::withMessages([
                    'lines' => ['يجب إضافة صنف واحد على الأقل لترحيل الحركة.'],
                ]);
            }

            // 1. معالجة السحب والإضافة المخزنية وتسجيل الأستاذ لكل سطر
            foreach ($movement->lines as $line) {
                $qty = (float) $line->quantity;
                $cost = (float) $line->unit_cost;

                // أ. خصم من المستودع المصدر (إن وجد)
                if ($movement->from_warehouse_id) {
                    $sourceBalance = $this->stockBalanceService->adjustBalance(
                        $line->item_id,
                        $movement->from_warehouse_id,
                        $line->from_location_id,
                        $line->batch_id,
                        -$qty,
                        $cost
                    );

                    $this->stockLedgerService->recordEntry(
                        $dateStr,
                        $line->item_id,
                        $movement->from_warehouse_id,
                        $line->from_location_id,
                        $line->batch_id,
                        'stock_movement',
                        $movement->id,
                        $line->id,
                        -$qty,
                        (float) $sourceBalance->quantity,
                        $cost,
                        "صرف/تحويل مستند حركة رقم {$movement->movement_number}"
                    );
                }

                // ب. إضافة إلى المستودع الوجهة (إن وجد)
                if ($movement->to_warehouse_id) {
                    $destBalance = $this->stockBalanceService->adjustBalance(
                        $line->item_id,
                        $movement->to_warehouse_id,
                        $line->to_location_id,
                        $line->batch_id,
                        +$qty,
                        $cost
                    );

                    $this->stockLedgerService->recordEntry(
                        $dateStr,
                        $line->item_id,
                        $movement->to_warehouse_id,
                        $line->to_location_id,
                        $line->batch_id,
                        'stock_movement',
                        $movement->id,
                        $line->id,
                        +$qty,
                        (float) $destBalance->quantity,
                        $cost,
                        "استلام/تحويل مستند حركة رقم {$movement->movement_number}"
                    );
                }
            }

            // 2. الأثر المحاسبي التلقائي
            if ($movement->movement_type === MovementType::WASTE) {
                $this->createWasteJournalEntry($movement);
            } elseif ($movement->movement_type === MovementType::ISSUE) {
                $this->createIssueJournalEntry($movement);
            } elseif ($movement->movement_type === MovementType::ADJUSTMENT) {
                $this->createAdjustmentJournalEntry($movement);
            }

            $movement->status = MovementStatus::POSTED;
            $movement->posted_at = Carbon::now();
            $movement->save();

            return $this->getMovement($movement->id);
        });
    }

    /**
     * إلغاء حركة مخزون مرحلة وعكس أثرها المخزني والمحاسبي
     */
    public function cancelMovement(int $id): StockMovement
    {
        return DB::transaction(function () use ($id) {
            /** @var StockMovement $movement */
            $movement = StockMovement::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($movement->status !== MovementStatus::POSTED) {
                throw ValidationException::withMessages([
                    'status' => ['لا يمكن إلغاء حركة غير مرحلة.'],
                ]);
            }

            $dateStr = Carbon::now()->toDateString();
            $movement->load('lines');

            // عكس الحركات في الأرصدة وسجل الأستاذ
            foreach ($movement->lines as $line) {
                $qty = (float) $line->quantity;
                $cost = (float) $line->unit_cost;

                // عكس المستودع الوجهة: خصم الكمية التي أضيفت سابقاً
                if ($movement->to_warehouse_id) {
                    $destBalance = $this->stockBalanceService->adjustBalance(
                        $line->item_id,
                        $movement->to_warehouse_id,
                        $line->to_location_id,
                        $line->batch_id,
                        -$qty,
                        $cost
                    );

                    $this->stockLedgerService->recordEntry(
                        $dateStr,
                        $line->item_id,
                        $movement->to_warehouse_id,
                        $line->to_location_id,
                        $line->batch_id,
                        'stock_movement_cancel',
                        $movement->id,
                        $line->id,
                        -$qty,
                        (float) $destBalance->quantity,
                        $cost,
                        "إلغاء مستند حركة رقم {$movement->movement_number}"
                    );
                }

                // عكس المستودع المصدر: إعادة الكمية التي خصمت سابقاً
                if ($movement->from_warehouse_id) {
                    $sourceBalance = $this->stockBalanceService->adjustBalance(
                        $line->item_id,
                        $movement->from_warehouse_id,
                        $line->from_location_id,
                        $line->batch_id,
                        +$qty,
                        $cost
                    );

                    $this->stockLedgerService->recordEntry(
                        $dateStr,
                        $line->item_id,
                        $movement->from_warehouse_id,
                        $line->from_location_id,
                        $line->batch_id,
                        'stock_movement_cancel',
                        $movement->id,
                        $line->id,
                        +$qty,
                        (float) $sourceBalance->quantity,
                        $cost,
                        "إلغاء مستند حركة رقم {$movement->movement_number}"
                    );
                }
            }

            // عكس القيد المحاسبي إن وُجد
            if ($movement->journal_entry_id) {
                $this->journalService->reverseEntry(
                    $movement->journal_entry_id,
                    "إلغاء مستند حركة مخزون رقم {$movement->movement_number}",
                    $dateStr
                );
            }

            $movement->status = MovementStatus::CANCELLED;
            $movement->save();

            return $this->getMovement($movement->id);
        });
    }

    /**
     * قيد إهلاك الهدر والتلف:
     * مدين: حـ/ تالف وفوائد الأغذية ومنتهية الصلاحية (5130)
     * دائن: حـ/ المخزون السلعي (1131 / 1132)
     */
    private function createWasteJournalEntry(StockMovement $movement): void
    {
        $totalCost = (float) $movement->lines->sum('total_cost');
        if ($totalCost <= 0) {
            return;
        }

        $wasteAccount = Account::where('code', '5130')->where('is_leaf', true)->first()
            ?? Account::where('code', '5200')->firstOrFail();

        $inventoryAccount = Account::where('code', '1131')->where('is_leaf', true)->first()
            ?? Account::where('code', '1130')->firstOrFail();

        $journalLines = [
            [
                'account_id' => $wasteAccount->id,
                'description' => "إهلاك هدر وتلف أصناف غذائية - حركة رقم {$movement->movement_number}",
                'debit' => $totalCost,
                'credit' => 0.0,
            ],
            [
                'account_id' => $inventoryAccount->id,
                'description' => "تخفيض المخزون بسبب الهدر - حركة رقم {$movement->movement_number}",
                'debit' => 0.0,
                'credit' => $totalCost,
            ],
        ];

        $journalEntry = $this->journalService->createAndPost([
            'branch_id' => $movement->branch_id,
            'date' => $movement->movement_date->toDateString(),
            'description' => "إهلاك هدر مخزني حركة رقم {$movement->movement_number}",
            'reference' => $movement->movement_number,
            'source_type' => 'manual',
        ], $journalLines);

        $movement->journal_entry_id = $journalEntry->id;
    }

    /**
     * قيد الصرف التشغيلي
     */
    private function createIssueJournalEntry(StockMovement $movement): void
    {
        $totalCost = (float) $movement->lines->sum('total_cost');
        if ($totalCost <= 0) {
            return;
        }

        $expenseAccount = Account::where('code', '5110')->where('is_leaf', true)->first()
            ?? Account::where('code', '5100')->firstOrFail();

        $inventoryAccount = Account::where('code', '1131')->where('is_leaf', true)->first()
            ?? Account::where('code', '1130')->firstOrFail();

        $journalLines = [
            [
                'account_id' => $expenseAccount->id,
                'description' => "صرف تشغيلي أصناف غذائية - حركة رقم {$movement->movement_number}",
                'debit' => $totalCost,
                'credit' => 0.0,
            ],
            [
                'account_id' => $inventoryAccount->id,
                'description' => "صرف من المخزون - حركة رقم {$movement->movement_number}",
                'debit' => 0.0,
                'credit' => $totalCost,
            ],
        ];

        $journalEntry = $this->journalService->createAndPost([
            'branch_id' => $movement->branch_id,
            'date' => $movement->movement_date->toDateString(),
            'description' => "صرف تشغيلي مخزني حركة رقم {$movement->movement_number}",
            'reference' => $movement->movement_number,
            'source_type' => 'manual',
        ], $journalLines);

        $movement->journal_entry_id = $journalEntry->id;
    }

    /**
     * قيد التسوية الجردية (عجز جردي)
     */
    private function createAdjustmentJournalEntry(StockMovement $movement): void
    {
        $totalCost = (float) $movement->lines->sum('total_cost');
        if ($totalCost <= 0) {
            return;
        }

        // إذا كانت الحركة سحب من مستودع (عجز جردي)
        if ($movement->from_warehouse_id && !$movement->to_warehouse_id) {
            $varianceAccount = Account::where('code', '5140')->where('is_leaf', true)->first()
                ?? Account::where('code', '5200')->firstOrFail();

            $inventoryAccount = Account::where('code', '1131')->where('is_leaf', true)->first()
                ?? Account::where('code', '1130')->firstOrFail();

            $journalLines = [
                [
                    'account_id' => $varianceAccount->id,
                    'description' => "عجز تسوية جرد مخزني - حركة رقم {$movement->movement_number}",
                    'debit' => $totalCost,
                    'credit' => 0.0,
                ],
                [
                    'account_id' => $inventoryAccount->id,
                    'description' => "تخفيض المخزون لعجز الجرد - حركة رقم {$movement->movement_number}",
                    'debit' => 0.0,
                    'credit' => $totalCost,
                ],
            ];

            $journalEntry = $this->journalService->createAndPost([
                'branch_id' => $movement->branch_id,
                'date' => $movement->movement_date->toDateString(),
                'description' => "تسوية جردية عجز حركة رقم {$movement->movement_number}",
                'reference' => $movement->movement_number,
                'source_type' => 'manual',
            ], $journalLines);

            $movement->journal_entry_id = $journalEntry->id;
        }
    }
}
