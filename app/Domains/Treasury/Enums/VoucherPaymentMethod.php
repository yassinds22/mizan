<?php

declare(strict_types=1);

namespace App\Domains\Treasury\Enums;

enum VoucherPaymentMethod: string
{
    case CASH = 'cash';
    case BANK_TRANSFER = 'bank_transfer';
    case CHEQUE = 'cheque';
    case POS = 'pos';

    public function label(): string
    {
        return match ($this) {
            self::CASH => 'نقداً',
            self::BANK_TRANSFER => 'تحويل بنكي',
            self::CHEQUE => 'شيك',
            self::POS => 'مدى / شبكة',
        };
    }
}
