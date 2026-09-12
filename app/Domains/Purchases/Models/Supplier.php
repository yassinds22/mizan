<?php

declare(strict_types=1);

namespace App\Domains\Purchases\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
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
        'payment_terms_days',
        'credit_limit',
        'balance',
        'is_active',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'credit_limit' => 'decimal:4',
        'balance' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function purchaseInvoices(): HasMany
    {
        return $this->hasMany(PurchaseInvoice::class);
    }
}
