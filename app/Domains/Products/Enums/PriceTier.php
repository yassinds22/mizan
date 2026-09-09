<?php

declare(strict_types=1);

namespace App\Domains\Products\Enums;

enum PriceTier: string
{
    case Retail = 'retail';
    case Wholesale = 'wholesale';
    case HalfWholesale = 'half_wholesale';
    case KeyAccounts = 'key_accounts';

    public function label(): string
    {
        return match ($this) {
            self::Retail => 'سعر التجزئة (قطاعي)',
            self::Wholesale => 'سعر الجملة',
            self::HalfWholesale => 'سعر نصف الجملة',
            self::KeyAccounts => 'سعر كبار العملاء والهايبر',
        };
    }
}
