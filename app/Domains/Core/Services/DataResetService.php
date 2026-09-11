<?php

declare(strict_types=1);

namespace App\Domains\Core\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class DataResetService
{
    public function __construct(
        protected DatabaseBackupService $backupService
    ) {}

    /**
     * استرجاع ملخص قبل التنفيذ (Dry-run Preview) للحركات التشغيلية
     */
    public function getDryRunSummary(): array
    {
        $salesInvoicesCount = Schema::hasTable('sales_invoices') ? DB::table('sales_invoices')->count() : 0;
        $salesItemsCount = Schema::hasTable('sales_invoice_items') ? DB::table('sales_invoice_items')->count() : 0;
        $journalEntriesCount = Schema::hasTable('journal_entries') ? DB::table('journal_entries')->count() : 0;
        $journalLinesCount = Schema::hasTable('journal_entry_lines') ? DB::table('journal_entry_lines')->count() : 0;
        $customersCount = Schema::hasTable('customers') ? DB::table('customers')->count() : 0;

        $companyName = DB::table('system_settings')->where('key', 'company_name')->value('value') ?? 'ميزان للتجارة';

        return [
            'company_name' => $companyName,
            'counts' => [
                'sales_invoices' => $salesInvoicesCount,
                'sales_invoice_items' => $salesItemsCount,
                'journal_entries' => $journalEntriesCount,
                'journal_entry_lines' => $journalLinesCount,
                'customers' => $customersCount,
            ],
            'total_records_to_wipe' => $salesInvoicesCount + $salesItemsCount + $journalEntriesCount + $journalLinesCount,
            'preserved_entities' => [
                'شجرة الحسابات والدليل المحاسبي (Chart of Accounts)',
                'الفروع والمستودعات الأساسية (Branches & Warehouses)',
                'فئات الضريبة والقواعد المالية (Tax Categories & Rates)',
                'العملات وأسعار الصرف (Currencies)',
                'بيانات وهوية المنشأة وإعدادات النظام (Company Profile & Settings)',
            ],
        ];
    }

    /**
     * تصفير الحركات التشغيلية بأمان بعد التحقق والنسخ الاحتياطي الإلزامي
     *
     * @param string $confirmationName اسم المنشأة المدخل للتأكيد
     * @return array
     * @throws ValidationException|RuntimeException
     */
    public function resetTransactionalData(string $confirmationName): array
    {
        // 1. التحقق من مطابقة اسم المنشأة
        $currentCompanyName = DB::table('system_settings')->where('key', 'company_name')->value('value') ?? '';
        $cleanCurrent = trim(mb_strtolower($currentCompanyName));
        $cleanInput = trim(mb_strtolower($confirmationName));

        if (empty($cleanInput) || $cleanInput !== $cleanCurrent) {
            $this->logAudit('FACTORY_RESET_REJECTED', [
                'reason' => 'Mismatch confirmation name',
                'expected' => $currentCompanyName,
                'received' => $confirmationName,
                'ip' => request()->ip() ?? 'CLI',
            ]);

            throw ValidationException::withMessages([
                'confirmation_name' => "اسم المنشأة المدخل غير مطابق للاسم الحالي [{$currentCompanyName}]. يرجى كتابته بدقة للتأكيد.",
            ]);
        }

        $this->logAudit('FACTORY_RESET_STARTED', [
            'company_name' => $currentCompanyName,
            'ip' => request()->ip() ?? 'CLI',
        ]);

        // 2. إنشاء نسخة احتياطية إلزامية قبل البدء (إذا فشلت النسخة تتوقف العملية فوراً)
        try {
            $backupInfo = $this->backupService->createBackup();
        } catch (\Throwable $e) {
            $this->logAudit('FACTORY_RESET_FAILED', [
                'reason' => 'Backup creation failed',
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        if (empty($backupInfo['success']) || !file_exists($backupInfo['path'])) {
            $this->logAudit('FACTORY_RESET_ABORTED', ['reason' => 'Backup file unverified']);
            throw new RuntimeException("فشل إنشاء النسخة الاحتياطية. تم إلغاء عملية التصفير بالكامل لحماية بياناتك.");
        }

        $this->logAudit('BACKUP_VERIFIED_BEFORE_RESET', [
            'filename' => $backupInfo['filename'],
            'size_bytes' => $backupInfo['size_bytes'],
        ]);

        // 3. مسح الحركات التشغيلية وفق تسلسل التبعيات المحاسبية داخل Transaction
        $stats = DB::transaction(function () {
            $deletedItems = 0;
            $deletedInvoices = 0;
            $deletedJournalLines = 0;
            $deletedJournals = 0;

            if (Schema::hasTable('sales_invoice_items')) {
                $deletedItems = DB::table('sales_invoice_items')->delete();
            }

            if (Schema::hasTable('sales_invoices')) {
                $deletedInvoices = DB::table('sales_invoices')->delete();
            }

            if (Schema::hasTable('journal_entry_lines')) {
                $deletedJournalLines = DB::table('journal_entry_lines')->delete();
            }

            if (Schema::hasTable('journal_entries')) {
                $deletedJournals = DB::table('journal_entries')->delete();
            }

            return [
                'sales_invoice_items' => $deletedItems,
                'sales_invoices' => $deletedInvoices,
                'journal_entry_lines' => $deletedJournalLines,
                'journal_entries' => $deletedJournals,
            ];
        });

        $this->logAudit('DATA_RESET_COMPLETED', [
            'company_name' => $currentCompanyName,
            'backup' => $backupInfo['filename'],
            'deleted_records' => $stats,
            'ip' => request()->ip() ?? 'CLI',
            'user_id' => auth()->id() ?? 'system',
        ]);

        return [
            'success' => true,
            'message' => 'تم تصفير كافة الحركات التشغيلية والفواتير والقيود القديمة بنجاح مع الاحتفاظ بكافة الإعدادات والحسابات.',
            'backup' => [
                'filename' => $backupInfo['filename'],
                'size_kb' => round($backupInfo['size_bytes'] / 1024, 2),
                'driver' => $backupInfo['driver'],
            ],
            'deleted_records' => $stats,
        ];
    }

    /**
     * تسجيل قيد تدقيق أمني للعمليات الحساسة
     */
    protected function logAudit(string $action, array $payload = []): void
    {
        $logPath = storage_path('logs/system_audit.log');
        $entry = [
            'timestamp' => now()->toIso8601String(),
            'action' => $action,
            'payload' => $payload,
        ];

        @file_put_contents($logPath, json_encode($entry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);
        \Illuminate\Support\Facades\Log::info("[AUDIT] {$action}", $payload);
    }
}
