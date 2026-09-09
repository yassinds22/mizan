<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Sales\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'code' => 'C-100',
                'name_ar' => 'عميل نقدي عام',
                'name_en' => 'Walk-in Cash Customer',
                'tax_number' => null,
                'commercial_register' => null,
                'phone' => '0500000000',
                'email' => 'cash@mizan-erp.test',
                'city' => 'الرياض',
                'address' => 'مبيعات التجزئة المباشرة',
                'credit_limit' => 0.0,
                'balance' => 0.0,
                'is_active' => true,
            ],
            [
                'code' => 'C-101',
                'name_ar' => 'سوبرماركت الواحة المركزية',
                'name_en' => 'Al-Waha Central Supermarket',
                'tax_number' => '310123456700003',
                'commercial_register' => '1010456789',
                'phone' => '0501234567',
                'email' => 'alwaha@supermarket.test',
                'city' => 'الرياض',
                'address' => 'حي السليمانية - شارع الملك عبد العزيز',
                'credit_limit' => 50000.0,
                'balance' => 0.0,
                'is_active' => true,
            ],
            [
                'code' => 'C-102',
                'name_ar' => 'تموينات الرائد الغذائية',
                'name_en' => 'Al-Raed Food Grocery',
                'tax_number' => '310234567800003',
                'commercial_register' => '1010567890',
                'phone' => '0559876543',
                'email' => 'alraed@grocery.test',
                'city' => 'جدة',
                'address' => 'حي الصفا - شارع الأربعين',
                'credit_limit' => 30000.0,
                'balance' => 0.0,
                'is_active' => true,
            ],
            [
                'code' => 'C-103',
                'name_ar' => 'مطاعم البحر الأحمر للمأكولات',
                'name_en' => 'Red Sea Restaurants',
                'tax_number' => '310345678900003',
                'commercial_register' => '2050123456',
                'phone' => '0531122334',
                'email' => 'redsea@restaurants.test',
                'city' => 'الدمام',
                'address' => 'طريق الكورنيش - مجمع المطاعم',
                'credit_limit' => 40000.0,
                'balance' => 0.0,
                'is_active' => true,
            ],
            [
                'code' => 'C-104',
                'name_ar' => 'أسواق الجزيرة الكبرى',
                'name_en' => 'Al-Jazeera Hypermarket',
                'tax_number' => '310456789000003',
                'commercial_register' => '1010678901',
                'phone' => '0543322110',
                'email' => 'info@aljazeera-market.test',
                'city' => 'الرياض',
                'address' => 'حي الروضة - طريق خريص',
                'credit_limit' => 100000.0,
                'balance' => 0.0,
                'is_active' => true,
            ],
        ];

        foreach ($customers as $data) {
            Customer::firstOrCreate(['code' => $data['code']], $data);
        }
    }
}
