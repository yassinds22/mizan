<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Inventory\Enums\BatchStatus;
use App\Domains\Inventory\Models\ItemBatch;
use App\Domains\Products\Models\Item;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ItemBatchSeeder extends Seeder
{
    public function run(): void
    {
        $milk = Item::where('name_ar', 'like', '%حليب%')->first() ?? Item::first();
        $yogurt = Item::where('name_ar', 'like', '%زبادي%')->first() ?? Item::skip(1)->first() ?? $milk;
        $oil = Item::where('name_ar', 'like', '%زيت%')->first() ?? Item::skip(2)->first() ?? $milk;
        $chicken = Item::where('name_ar', 'like', '%دجاج%')->first() ?? Item::skip(3)->first() ?? $milk;

        $batches = [
            // حليب كامل الدسم 1 لتر
            [
                'item_id' => $milk->id,
                'batch_number' => 'B-4491',
                'production_date' => Carbon::now()->subDays(15)->toDateString(),
                'expiry_date' => Carbon::now()->addDays(2)->toDateString(), // وشيكة الانتهاء FEFO
                'unit_cost' => 4.5000,
                'status' => BatchStatus::ACTIVE,
                'notes' => 'دفعة ألبان طازجة قريبة الانتهاء — أولوية صرف FEFO',
            ],
            [
                'item_id' => $milk->id,
                'batch_number' => 'B-4518',
                'production_date' => Carbon::now()->subDays(2)->toDateString(),
                'expiry_date' => Carbon::now()->addDays(20)->toDateString(),
                'unit_cost' => 4.5000,
                'status' => BatchStatus::ACTIVE,
                'notes' => 'توريد أسبوعي جديد',
            ],

            // زبادي
            [
                'item_id' => $yogurt->id,
                'batch_number' => 'B-4510',
                'production_date' => Carbon::now()->subDays(10)->toDateString(),
                'expiry_date' => Carbon::now()->addDays(5)->toDateString(),
                'unit_cost' => 1.8000,
                'status' => BatchStatus::ACTIVE,
                'notes' => 'دفعة زبادي طبيعي',
            ],

            // زيت ذرة 1.8 لتر
            [
                'item_id' => $oil->id,
                'batch_number' => 'B-4488',
                'production_date' => Carbon::now()->subMonths(3)->toDateString(),
                'expiry_date' => Carbon::now()->addMonths(9)->toDateString(),
                'unit_cost' => 18.0000,
                'status' => BatchStatus::ACTIVE,
                'notes' => 'زيوت حبوب مستودع جاف',
            ],

            // دجاج مجمد
            [
                'item_id' => $chicken->id,
                'batch_number' => 'B-4320',
                'production_date' => Carbon::now()->subMonths(2)->toDateString(),
                'expiry_date' => Carbon::now()->addMonths(10)->toDateString(),
                'unit_cost' => 14.5000,
                'status' => BatchStatus::ACTIVE,
                'notes' => 'دواجن مجمدة -18°م',
            ],
        ];

        foreach ($batches as $batchData) {
            ItemBatch::updateOrCreate(
                [
                    'item_id' => $batchData['item_id'],
                    'batch_number' => $batchData['batch_number'],
                ],
                $batchData
            );
        }
    }
}
