<?php

use App\Domains\Core\Models\Branch;
use App\Domains\Core\Models\Currency;
use App\Domains\Core\Models\FiscalPeriod;
use App\Domains\Core\Models\FiscalYear;
use App\Domains\Core\Models\TaxCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1/core')->group(function () {
    // 1. العملات وأسعار الصرف (CRUD كامل عبر Controller و Service و Repository)
    Route::apiResource('currencies', \App\Http\Controllers\Api\V1\Core\CurrencyController::class);
    Route::patch('currencies/{id}/toggle', [\App\Http\Controllers\Api\V1\Core\CurrencyController::class, 'toggleActive']);
    Route::post('currencies/{id}/rates', [\App\Http\Controllers\Api\V1\Core\CurrencyController::class, 'addRate']);
    Route::get('currencies/{id}/rates', [\App\Http\Controllers\Api\V1\Core\CurrencyController::class, 'ratesHistory']);



    // 2. الفروع (CRUD كامل عبر Controller و Service و Repository)
    Route::apiResource('branches', \App\Http\Controllers\Api\V1\Core\BranchController::class);
    Route::patch('branches/{id}/toggle', [\App\Http\Controllers\Api\V1\Core\BranchController::class, 'toggleActive']);

    // 3. السنوات والفترات المالية (CRUD كامل عبر Controller و Service و Repository)
    Route::get('fiscal-years', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'indexYears']);
    Route::post('fiscal-years', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'storeYear']);
    Route::get('fiscal-years/{id}', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'showYear']);
    Route::patch('fiscal-years/{id}/close', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'closeYear']);

    Route::get('fiscal-periods', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'indexPeriods']);
    Route::get('fiscal-periods/{id}', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'showPeriod']);
    Route::patch('fiscal-periods/{id}/status', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'updatePeriodStatus']);
    Route::patch('fiscal-periods/{id}/close', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'closePeriod']);
    Route::patch('fiscal-periods/{id}/reopen', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'reopenPeriod']);
    Route::post('fiscal-periods/check-date', [\App\Http\Controllers\Api\V1\Core\FiscalYearController::class, 'checkDate']);


    // 4. فئات الضرائب ونسب الضريبة (CRUD كامل عبر Controller و Service و Repository)
    Route::get('tax-categories', [\App\Http\Controllers\Api\V1\Core\TaxCategoryController::class, 'index']);
    Route::get('tax-categories/{id}', [\App\Http\Controllers\Api\V1\Core\TaxCategoryController::class, 'show']);
    Route::put('tax-categories/{id}', [\App\Http\Controllers\Api\V1\Core\TaxCategoryController::class, 'update']);
    Route::post('tax-categories/{id}/rates', [\App\Http\Controllers\Api\V1\Core\TaxCategoryController::class, 'addRate']);
    Route::get('tax-categories/{id}/rates', [\App\Http\Controllers\Api\V1\Core\TaxCategoryController::class, 'rates']);
    Route::post('tax-categories/calculate', [\App\Http\Controllers\Api\V1\Core\TaxCategoryController::class, 'calculate']);

    // 5. إعدادات المنشأة والسياسات العامة وتأسيس وتصفير النظام
    Route::get('settings', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'index']);
    Route::post('settings', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'update']);
    Route::get('settings/status', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'status']);
    Route::post('settings/init-client', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'initClient']);
    Route::get('settings/reset-preview', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'resetPreview']);
    Route::post('settings/reset-data', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'resetData']);
});

Route::prefix('v1/accounting')->group(function () {
    // 1. دليل الحسابات (Chart of Accounts)
    Route::get('accounts/tree', [\App\Http\Controllers\Api\V1\Accounting\AccountController::class, 'tree']);
    Route::get('accounts/leaf', [\App\Http\Controllers\Api\V1\Accounting\AccountController::class, 'leafAccounts']);
    Route::apiResource('accounts', \App\Http\Controllers\Api\V1\Accounting\AccountController::class);

    // 2. قيود اليومية المحاسبية (Journal Entries Engine)
    Route::apiResource('journal-entries', \App\Http\Controllers\Api\V1\Accounting\JournalEntryController::class);
    Route::post('journal-entries/{id}/post', [\App\Http\Controllers\Api\V1\Accounting\JournalEntryController::class, 'post']);
    Route::post('journal-entries/{id}/reverse', [\App\Http\Controllers\Api\V1\Accounting\JournalEntryController::class, 'reverse']);

    // 3. مراكز التكلفة (Cost Centers)
    Route::apiResource('cost-centers', \App\Http\Controllers\Api\V1\Accounting\CostCenterController::class);

    // 4. كشوفات الحساب المالية للعملاء والموردين (Party Statements Engine)
    Route::get('statements/party', [\App\Http\Controllers\Api\V1\Accounting\PartyStatementController::class, 'index']);

    // 5. محرك وشاشات التقارير والقوائم المالية الختامية (Financial Reports & Statements Engine)
    Route::prefix('reports')->group(function () {
        Route::get('trial-balance', [\App\Http\Controllers\Api\V1\Accounting\FinancialReportController::class, 'trialBalance']);
        Route::get('account-ledger/{accountId}', [\App\Http\Controllers\Api\V1\Accounting\FinancialReportController::class, 'accountLedger']);
        Route::get('income-statement', [\App\Http\Controllers\Api\V1\Accounting\FinancialReportController::class, 'incomeStatement']);
        Route::get('balance-sheet', [\App\Http\Controllers\Api\V1\Accounting\FinancialReportController::class, 'balanceSheet']);
        Route::get('vat-position', [\App\Http\Controllers\Api\V1\Accounting\FinancialReportController::class, 'vatPosition']);
    });
});

Route::prefix('v1/products')->group(function () {
    // 1. وحدات القياس (Units of Measure)
    Route::apiResource('units-of-measure', \App\Http\Controllers\Api\V1\Products\UnitOfMeasureController::class);

    // 2. تصنيفات الأصناف (Item Categories & Tree)
    Route::get('categories/tree', [\App\Http\Controllers\Api\V1\Products\ItemCategoryController::class, 'tree']);
    Route::apiResource('categories', \App\Http\Controllers\Api\V1\Products\ItemCategoryController::class);

    // 3. بطاقة الأصناف والتسعير متعدد الوحدات (Items Master & Multi-UOM & Barcodes)
    Route::get('items/barcode/{barcode}', [\App\Http\Controllers\Api\V1\Products\ItemController::class, 'findByBarcode']);
    Route::post('items/{id}/convert-quantity', [\App\Http\Controllers\Api\V1\Products\ItemController::class, 'convertQuantity']);
    Route::get('items/{id}/price', [\App\Http\Controllers\Api\V1\Products\ItemController::class, 'resolvePrice']);
    Route::apiResource('items', \App\Http\Controllers\Api\V1\Products\ItemController::class);
});

Route::prefix('v1/sales')->group(function () {
    // 1. العملاء (Customers)
    Route::get('customers/all-active', [\App\Http\Controllers\Api\V1\Sales\CustomerController::class, 'allActive']);
    Route::apiResource('customers', \App\Http\Controllers\Api\V1\Sales\CustomerController::class);

    // 2. فواتير المبيعات (Sales Invoices & ZATCA Integration)
    Route::post('invoices/{id}/post', [\App\Http\Controllers\Api\V1\Sales\SalesInvoiceController::class, 'post']);
    Route::post('invoices/{id}/cancel', [\App\Http\Controllers\Api\V1\Sales\SalesInvoiceController::class, 'cancel']);
    Route::apiResource('invoices', \App\Http\Controllers\Api\V1\Sales\SalesInvoiceController::class);

    // 3. مرتجعات المبيعات والإشعارات الدائنة (Sales Returns & Credit Notes)
    Route::get('invoices/{id}/returnable-lines', [\App\Http\Controllers\Api\V1\Sales\SalesReturnController::class, 'returnableLines']);
    Route::post('returns', [\App\Http\Controllers\Api\V1\Sales\SalesReturnController::class, 'store']);
    Route::get('returns/{id}', [\App\Http\Controllers\Api\V1\Sales\SalesReturnController::class, 'show']);
});

Route::prefix('v1/purchases')->group(function () {
    // 1. الموردين (Suppliers)
    Route::get('suppliers/all-active', [\App\Http\Controllers\Api\V1\Purchases\SupplierController::class, 'allActive']);
    Route::apiResource('suppliers', \App\Http\Controllers\Api\V1\Purchases\SupplierController::class);

    // 2. فواتير المشتريات (Purchase Invoices)
    Route::post('invoices/{id}/post', [\App\Http\Controllers\Api\V1\Purchases\PurchaseInvoiceController::class, 'post']);
    Route::post('invoices/{id}/cancel', [\App\Http\Controllers\Api\V1\Purchases\PurchaseInvoiceController::class, 'cancel']);
    Route::apiResource('invoices', \App\Http\Controllers\Api\V1\Purchases\PurchaseInvoiceController::class);

    // 3. مردودات المشتريات والإشعارات المدينة (Purchase Returns & Debit Notes)
    Route::get('invoices/{id}/returnable-lines', [\App\Http\Controllers\Api\V1\Purchases\PurchaseReturnController::class, 'returnableLines']);
    Route::post('returns/{id}/cancel', [\App\Http\Controllers\Api\V1\Purchases\PurchaseReturnController::class, 'cancel']);
    Route::apiResource('returns', \App\Http\Controllers\Api\V1\Purchases\PurchaseReturnController::class)->only(['index', 'store', 'show']);
});

Route::prefix('v1/treasury')->group(function () {
    // سندات القبض والصرف (Treasury Vouchers)
    Route::get('open-invoices', [\App\Http\Controllers\Api\V1\Treasury\VoucherController::class, 'openInvoices']);
    Route::post('vouchers/{id}/post', [\App\Http\Controllers\Api\V1\Treasury\VoucherController::class, 'post']);
    Route::post('vouchers/{id}/cancel', [\App\Http\Controllers\Api\V1\Treasury\VoucherController::class, 'cancel']);
    Route::apiResource('vouchers', \App\Http\Controllers\Api\V1\Treasury\VoucherController::class);
});



