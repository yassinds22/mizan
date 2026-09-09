<?php

declare(strict_types=1);

namespace App\Domains\Core\Enums;

enum FiscalPeriodStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
    case Locked = 'locked';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'مفتوحة',
            self::Closed => 'مغلقة',
            self::Locked => 'مجمدة',
        };
    }
}
