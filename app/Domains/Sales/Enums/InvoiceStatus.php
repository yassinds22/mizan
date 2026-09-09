<?php

declare(strict_types=1);

namespace App\Domains\Sales\Enums;

enum InvoiceStatus: string
{
    case DRAFT = 'draft';
    case POSTED = 'posted';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'مسودة',
            self::POSTED => 'مرحّلة ومؤكدة',
            self::CANCELLED => 'ملغاة',
        };
    }
}
