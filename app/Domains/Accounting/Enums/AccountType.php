<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Enums;

enum AccountType: string
{
    case Asset = 'asset';
    case Liability = 'liability';
    case Equity = 'equity';
    case Revenue = 'revenue';
    case Expense = 'expense';

    public function label(): string
    {
        return match ($this) {
            self::Asset => 'أصول (Assets)',
            self::Liability => 'خصوم / التزامات (Liabilities)',
            self::Equity => 'حقوق ملكية (Equity)',
            self::Revenue => 'إيرادات (Revenue)',
            self::Expense => 'مصروفات (Expenses)',
        };
    }

    public function defaultNature(): AccountNature
    {
        return match ($this) {
            self::Asset, self::Expense => AccountNature::Debit,
            self::Liability, self::Equity, self::Revenue => AccountNature::Credit,
        };
    }

    public function isBalanceSheet(): bool
    {
        return in_array($this, [self::Asset, self::Liability, self::Equity], true);
    }

    public function isIncomeStatement(): bool
    {
        return in_array($this, [self::Revenue, self::Expense], true);
    }
}
