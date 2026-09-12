<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Enums;

enum BatchStatus: string
{
    case ACTIVE = 'active';
    case QUARANTINE = 'quarantine';
    case EXPIRED = 'expired';
    case DEPLETED = 'depleted';

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE => 'نشطة وصالحة',
            self::QUARANTINE => 'تحت الفحص / حجر',
            self::EXPIRED => 'منتهية الصلاحية',
            self::DEPLETED => 'مستنفدة الرصيد',
        };
    }
}
