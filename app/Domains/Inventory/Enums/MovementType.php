<?php

declare(strict_types=1);

namespace App\Domains\Inventory\Enums;

enum MovementType: string
{
    case TRANSFER = 'transfer';
    case WASTE = 'waste';
    case ADJUSTMENT = 'adjustment';
    case ISSUE = 'issue';
    case RECEIPT = 'receipt';

    public function label(): string
    {
        return match ($this) {
            self::TRANSFER => 'تحويل بين مستودعات',
            self::WASTE => 'إهلاك هدر وتلف',
            self::ADJUSTMENT => 'تسوية جردية',
            self::ISSUE => 'صرف تشغيلي',
            self::RECEIPT => 'استلام مخزني مباشر',
        };
    }

    /**
     * هل الحركة تؤثر على الأرباح والخسائر محاسبياً
     */
    public function hasFinancialEffect(): bool
    {
        return match ($this) {
            self::TRANSFER => false, // تحويل داخلي لا يغير قيمة المخزون الكلي
            self::WASTE, self::ADJUSTMENT, self::ISSUE, self::RECEIPT => true,
        };
    }
}
