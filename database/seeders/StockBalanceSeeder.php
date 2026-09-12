<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Inventory\Models\StockBalance;
use App\Domains\Inventory\Services\StockBalanceService;
use App\Domains\Warehouses\Models\Warehouse;
use App\Domains\Warehouses\Models\WarehouseLocation;
use Illuminate\Database\Seeder;

class StockBalanceSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(StockBalanceService::class);

        $whMain = Warehouse::where('code', 'WH-01')->first();
        $whChiller1 = Warehouse::where('code', 'WH-02')->first();
        $whFreezer = Warehouse::where('code', 'WH-04')->first();

        $locOil = WarehouseLocation::where('code', 'LOC-B01')->first();
        $locDairy = WarehouseLocation::where('code', 'LOC-C01')->first();
        $locMeat = WarehouseLocation::where('code', 'LOC-F01')->first();

        $b4491 = ItemBatch::where('batch_number', 'B-4491')->first();
        $b4518 = ItemBatch::where('batch_number', 'B-4518')->first();
        $b4510 = ItemBatch::where('batch_number', 'B-4510')->first();
        $b4488 = ItemBatch::where('batch_number', 'B-4488')->first();
        $b4320 = ItemBatch::where('batch_number', 'B-4320')->first();

        $entries = [];

        if ($b4491 && $whChiller1) {
            $entries[] = [
                'item_id' => $b4491->item_id,
                'warehouse_id' => $whChiller1->id,
                'location_id' => $locDairy?->id,
                'batch_id' => $b4491->id,
                'quantity' => 40.0,
                'unit_cost' => (float) $b4491->unit_cost,
            ];
        }

        if ($b4518 && $whChiller1) {
            $entries[] = [
                'item_id' => $b4518->item_id,
                'warehouse_id' => $whChiller1->id,
                'location_id' => $locDairy?->id,
                'batch_id' => $b4518->id,
                'quantity' => 60.0,
                'unit_cost' => (float) $b4518->unit_cost,
            ];
        }

        if ($b4510 && $whChiller1) {
            $entries[] = [
                'item_id' => $b4510->item_id,
                'warehouse_id' => $whChiller1->id,
                'location_id' => $locDairy?->id,
                'batch_id' => $b4510->id,
                'quantity' => 80.0,
                'unit_cost' => (float) $b4510->unit_cost,
            ];
        }

        if ($b4488 && $whMain) {
            $entries[] = [
                'item_id' => $b4488->item_id,
                'warehouse_id' => $whMain->id,
                'location_id' => $locOil?->id,
                'batch_id' => $b4488->id,
                'quantity' => 120.0,
                'unit_cost' => (float) $b4488->unit_cost,
            ];
        }

        if ($b4320 && $whFreezer) {
            $entries[] = [
                'item_id' => $b4320->item_id,
                'warehouse_id' => $whFreezer->id,
                'location_id' => $locMeat?->id,
                'batch_id' => $b4320->id,
                'quantity' => 90.0,
                'unit_cost' => (float) $b4320->unit_cost,
            ];
        }

        foreach ($entries as $e) {
            $service->adjustBalance(
                $e['item_id'],
                $e['warehouse_id'],
                $e['location_id'],
                $e['batch_id'],
                $e['quantity'],
                $e['unit_cost']
            );
        }
    }
}
