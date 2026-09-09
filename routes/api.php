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

    // 5. إعدادات المنشأة والسياسات العامة (Settings CRUD)
    Route::get('settings', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'index']);
    Route::post('settings', [\App\Http\Controllers\Api\V1\Core\SettingController::class, 'update']);
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
});

