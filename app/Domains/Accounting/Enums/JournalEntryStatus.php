<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Enums;

enum JournalEntryStatus: string
{
    case Draft = 'draft';
    case Posted = 'posted';
    case Reversed = 'reversed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'مسودة',
            self::Posted => 'مرحّل',
            self::Reversed => 'معكوس / ملغى بقيد عكسي',
        };
    }

    public function isDraft(): bool
    {
        return $this === self::Draft;
    }

    public function isPosted(): bool
    {
        return $this === self::Posted;
    }

    public function isReversed(): bool
    {
        return $this === self::Reversed;
    }
}
