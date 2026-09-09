<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
