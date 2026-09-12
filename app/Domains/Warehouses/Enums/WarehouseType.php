<?php

declare(strict_types=1);

namespace App\Domains\Warehouses\Enums;

enum WarehouseType: string
{
    case DRY = 'dry';
    case CHILLED = 'chilled';
    case FROZEN = 'frozen';

    public function label(): string
    {
        return match ($this) {
            self::DRY => 'جاف',
            self::CHILLED => 'مبرد',
            self::FROZEN => 'مجمّد',
        };
    }

    public function defaultTempRange(): string
    {
        return match ($this) {
            self::DRY => '18–22°م',
            self::CHILLED => '2–6°م',
            self::FROZEN => '-18°م',
        };
    }
}
