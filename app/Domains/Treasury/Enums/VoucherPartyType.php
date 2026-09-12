<?php

declare(strict_types=1);

namespace App\Domains\Treasury\Enums;

enum VoucherPartyType: string
{
    case CUSTOMER = 'customer';
    case SUPPLIER = 'supplier';
    case ACCOUNT = 'account';

    public function label(): string
    {
        return match ($this) {
            self::CUSTOMER => 'عميل',
            self::SUPPLIER => 'مورد',
            self::ACCOUNT => 'حساب عام',
        };
    }
}
