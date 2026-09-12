<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Core\Models\Branch;
use App\Domains\Warehouses\Enums\WarehouseType;
use App\Domains\Warehouses\Models\Warehouse;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::first() ?? Branch::create([
            'code' => 'BR-RUH-01',
            'name' => 'الفرع الرئيسي — مستودع الرياض المركزي',
            'city' => 'الرياض',
            'is_active' => true,
        ]);

        $warehouses = [
            [
                'code' => 'WH-01',
                'name' => 'المستودع الرئيسي',
                'type' => WarehouseType::DRY,
                'temp_range' => '18–22°م',
                'capacity' => 1000,
                'notes' => 'المستودع الجاف للبضائع غير المبردة والزيوت والحبوب',
            ],
            [
                'code' => 'WH-02',
                'name' => 'الثلاجة 1',
                'type' => WarehouseType::CHILLED,
                'temp_range' => '2–6°م',
                'capacity' => 200,
                'notes' => 'مخصص للألبان والأجبان والعصائر الطازجة',
            ],
            [
                'code' => 'WH-03',
                'name' => 'الثلاجة 2',
                'type' => WarehouseType::CHILLED,
                'temp_range' => '2–6°م',
                'capacity' => 180,
                'notes' => 'غرفة تبريد احتياطية وللشحنات سريعة الصرف',
            ],
            [
                'code' => 'WH-04',
                'name' => 'المجمدات',
                'type' => WarehouseType::FROZEN,
                'temp_range' => '-18°م',
                'capacity' => 250,
                'notes' => 'مستودع التجميد العميق للحوم والدواجن والخضار المجمدة',
            ],
        ];

        $locationsMap = [
            'WH-01' => [
                ['code' => 'LOC-A01', 'name' => 'ممر أ — الرف الأول', 'type' => 'rack', 'capacity' => 150],
                ['code' => 'LOC-A02', 'name' => 'ممر أ — الرف الثاني', 'type' => 'rack', 'capacity' => 150],
                ['code' => 'LOC-B01', 'name' => 'ممر ب — طبالي أرضية للزيوت', 'type' => 'floor', 'capacity' => 300],
            ],
            'WH-02' => [
                ['code' => 'LOC-C01', 'name' => 'ثلاجة الألبان والأجبان', 'type' => 'shelf', 'capacity' => 100],
                ['code' => 'LOC-C02', 'name' => 'ثلاجة العصائر الطازجة', 'type' => 'shelf', 'capacity' => 100],
            ],
            'WH-03' => [
                ['code' => 'LOC-C03', 'name' => 'غرفة التبريد السريع / الاحتياطية', 'type' => 'shelf', 'capacity' => 180],
            ],
            'WH-04' => [
                ['code' => 'LOC-F01', 'name' => 'مجمد اللحوم والدواجن (-18°م)', 'type' => 'rack', 'capacity' => 150],
                ['code' => 'LOC-F02', 'name' => 'مجمد الخضار والأسماك (-18°م)', 'type' => 'rack', 'capacity' => 100],
            ],
        ];

        foreach ($warehouses as $data) {
            $warehouse = Warehouse::updateOrCreate(
                ['code' => $data['code']],
                array_merge($data, [
                    'branch_id' => $branch->id,
                    'is_active' => true,
                ])
            );

            if (isset($locationsMap[$data['code']])) {
                foreach ($locationsMap[$data['code']] as $locData) {
                    $warehouse->locations()->updateOrCreate(
                        ['code' => $locData['code']],
                        array_merge($locData, ['is_active' => true])
                    );
                }
            }
        }
    }
}
