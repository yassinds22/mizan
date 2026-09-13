<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Domains\Core\Repositories\Contracts\BranchRepositoryInterface::class,
            \App\Domains\Core\Repositories\Eloquent\BranchRepository::class
        );

        $this->app->bind(
            \App\Domains\Core\Repositories\Contracts\CurrencyRepositoryInterface::class,
            \App\Domains\Core\Repositories\Eloquent\CurrencyRepository::class
        );

        $this->app->bind(
            \App\Domains\Core\Repositories\Contracts\FiscalYearRepositoryInterface::class,
            \App\Domains\Core\Repositories\Eloquent\FiscalYearRepository::class
        );

        $this->app->bind(
            \App\Domains\Core\Repositories\Contracts\TaxCategoryRepositoryInterface::class,
            \App\Domains\Core\Repositories\Eloquent\TaxCategoryRepository::class
        );

        $this->app->bind(
            \App\Domains\Core\Repositories\Contracts\SettingRepositoryInterface::class,
            \App\Domains\Core\Repositories\Eloquent\SettingRepository::class
        );

        $this->app->bind(
            \App\Domains\Accounting\Repositories\Contracts\AccountRepositoryInterface::class,
            \App\Domains\Accounting\Repositories\Eloquent\AccountRepository::class
        );

        $this->app->bind(
            \App\Domains\Accounting\Repositories\Contracts\JournalEntryRepositoryInterface::class,
            \App\Domains\Accounting\Repositories\Eloquent\JournalEntryRepository::class
        );

        $this->app->bind(
            \App\Domains\Products\Repositories\Contracts\UnitOfMeasureRepositoryInterface::class,
            \App\Domains\Products\Repositories\Eloquent\UnitOfMeasureRepository::class
        );

        $this->app->bind(
            \App\Domains\Products\Repositories\Contracts\ItemCategoryRepositoryInterface::class,
            \App\Domains\Products\Repositories\Eloquent\ItemCategoryRepository::class
        );

        $this->app->bind(
            \App\Domains\Products\Repositories\Contracts\ItemRepositoryInterface::class,
            \App\Domains\Products\Repositories\Eloquent\ItemRepository::class
        );

        $this->app->bind(
            \App\Domains\Sales\Repositories\Contracts\CustomerRepositoryInterface::class,
            \App\Domains\Sales\Repositories\Eloquent\CustomerRepository::class
        );

        $this->app->bind(
            \App\Domains\Sales\Repositories\Contracts\SalesInvoiceRepositoryInterface::class,
            \App\Domains\Sales\Repositories\Eloquent\SalesInvoiceRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // صمام أمان المدير العام: يمنح المدير العام النشط كافة الصلاحيات تلقائياً
        Gate::before(function ($user, $ability) {
            return ($user->is_super_admin && $user->is_active) ? true : null;
        });
    }
}

