<?php

declare(strict_types=1);

namespace App\Domains\Treasury\Enums;

enum VoucherStatus: string
{
    case DRAFT = 'draft';
    case POSTED = 'posted';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'مسودة',
            self::POSTED => 'مرحل',
            self::CANCELLED => 'ملغى',
        };
    }
}
