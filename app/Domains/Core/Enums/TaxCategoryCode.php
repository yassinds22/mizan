<?php

declare(strict_types=1);

namespace App\Domains\Core\Enums;

enum TaxCategoryCode: string
{
    case Standard = 'STANDARD';
    case Zero = 'ZERO';
    case Exempt = 'EXEMPT';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'الضريبة القياسية (15%)',
            self::Zero => 'نسبة صفرية (0%)',
            self::Exempt => 'معفاة من الضريبة',
        };
    }
}
