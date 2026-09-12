<?php

declare(strict_types=1);

namespace App\Domains\Treasury\Enums;

enum VoucherType: string
{
    case RECEIPT = 'receipt';
    case PAYMENT = 'payment';

    public function label(): string
    {
        return match ($this) {
            self::RECEIPT => 'سند قبض',
            self::PAYMENT => 'سند صرف',
        };
    }
}
