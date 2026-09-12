<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Enums;

enum StocktakeStatus: string
{
    case DRAFT = 'draft';
    case IN_PROGRESS = 'in_progress';
    case POSTED = 'posted';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'مسودة',
            self::IN_PROGRESS => 'قيد الجرد الميداني',
            self::POSTED => 'مرحل ومعتمد',
            self::CANCELLED => 'ملغي',
        };
    }
}
