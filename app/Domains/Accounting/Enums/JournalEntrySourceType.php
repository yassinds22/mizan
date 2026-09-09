<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Enums;

enum JournalEntrySourceType: string
{
    case Manual = 'manual';
    case SalesInvoice = 'sales_invoice';
    case SalesReturn = 'sales_return';
    case PurchaseInvoice = 'purchase_invoice';
    case PurchaseReturn = 'purchase_return';
    case PaymentVoucher = 'payment_voucher';
    case ReceiptVoucher = 'receipt_voucher';
    case InventoryAdjustment = 'inventory_adjustment';
    case PeriodClosing = 'period_closing';
    case OpeningBalance = 'opening_balance';
    case PosSession = 'pos_session';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'قيد يدوي عام',
            self::SalesInvoice => 'فاتورة مبيعات',
            self::SalesReturn => 'مردود مبيعات',
            self::PurchaseInvoice => 'فاتورة مشتريات',
            self::PurchaseReturn => 'مردود مشتريات',
            self::PaymentVoucher => 'سند صرف نقدي / بنكي',
            self::ReceiptVoucher => 'سند قبض نقدي / بنكي',
            self::InventoryAdjustment => 'تسوية مخزون وتوالف',
            self::PeriodClosing => 'إقفال فترات مالية',
            self::OpeningBalance => 'أرصدة افتتاحية',
            self::PosSession => 'جلسة مبيعات نقاط البيع (POS)',
        };
    }
}
