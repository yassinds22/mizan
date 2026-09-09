<?php

declare(strict_types=1);

namespace App\Domains\Sales\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'tax_number',
        'commercial_register',
        'phone',
        'email',
        'city',
        'address',
        'credit_limit',
        'balance',
        'is_active',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:4',
        'balance' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function invoices(): HasMany
    {
        return $this->hasMany(SalesInvoice::class);
    }
}
