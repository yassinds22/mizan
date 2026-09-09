<?php

declare(strict_types=1);

namespace App\Domains\Products\Enums;

enum StorageCondition: string
{
    case Ambient = 'ambient';
    case Chilled = 'chilled';
    case Frozen = 'frozen';

    public function label(): string
    {
        return match ($this) {
            self::Ambient => 'جاف وعادي (حرارة الغرفة)',
            self::Chilled => 'مبرد (2 إلى 5 درجات مئوية)',
            self::Frozen => 'مجمد (-18 درجة مئوية)',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Ambient => 'package',
            self::Chilled => 'thermometer',
            self::Frozen => 'snowflake',
        };
    }

    public function requiresCooling(): bool
    {
        return in_array($this, [self::Chilled, self::Frozen], true);
    }
}
