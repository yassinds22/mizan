<?php

declare(strict_types=1);

namespace App\Domains\Sales\Enums;

enum PaymentMethod: string
{
    case CASH = 'cash';
    case CREDIT = 'credit';
    case BANK_TRANSFER = 'bank_transfer';

    public function label(): string
    {
        return match ($this) {
            self::CASH => 'نقدي',
            self::CREDIT => 'آجل (ذمم مدينة)',
            self::BANK_TRANSFER => 'شبكة / تحويل بنكي',
        };
    }
}
