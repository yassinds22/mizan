<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            CoreSeeder::class,
            RolesAndPermissionsSeeder::class,
            AccountingSeeder::class,
            ProductSeeder::class,
            CustomerSeeder::class,
            WarehouseSeeder::class,
            ItemBatchSeeder::class,
            StockBalanceSeeder::class,
        ]);
    }
}
