<?php

declare(strict_types=1);

namespace App\Domains\Sales\Repositories\Eloquent;

use App\Domains\Sales\Models\SalesInvoice;
use App\Domains\Sales\Repositories\Contracts\SalesInvoiceRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class SalesInvoiceRepository implements SalesInvoiceRepositoryInterface
{
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $query = SalesInvoice::with(['customer', 'branch']);

        if (!empty($filters['search'])) {
            $search = (string) $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_tax_number', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (!empty($filters['from_date'])) {
            $query->where('invoice_date', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->where('invoice_date', '<=', $filters['to_date']);
        }

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    public function findById(int $id): ?SalesInvoice
    {
        return SalesInvoice::with(['customer', 'branch', 'lines.item', 'lines.itemUnit', 'journalEntry.lines.account'])->find($id);
    }

    public function findByNumber(string $invoiceNumber): ?SalesInvoice
    {
        return SalesInvoice::with(['customer', 'branch', 'lines.item', 'lines.itemUnit', 'journalEntry.lines.account'])->where('invoice_number', $invoiceNumber)->first();
    }

    public function create(array $data, array $lines = []): SalesInvoice
    {
        return DB::transaction(function () use ($data, $lines) {
            $invoice = SalesInvoice::create($data);

            if (!empty($lines)) {
                $invoice->lines()->createMany($lines);
            }

            return $invoice->load(['lines.item', 'lines.itemUnit', 'customer', 'branch']);
        });
    }

    public function update(SalesInvoice $invoice, array $data, ?array $lines = null): SalesInvoice
    {
        return DB::transaction(function () use ($invoice, $data, $lines) {
            $invoice->update($data);

            if ($lines !== null) {
                $invoice->lines()->delete();
                $invoice->lines()->createMany($lines);
            }

            return $invoice->fresh(['lines.item', 'lines.itemUnit', 'customer', 'branch']);
        });
    }

    public function delete(SalesInvoice $invoice): bool
    {
        return (bool) $invoice->delete();
    }

    public function generateNextInvoiceNumber(string $date): string
    {
        $prefix = 'INV-' . Carbon::parse($date)->format('Ym') . '-';
        $last = SalesInvoice::where('invoice_number', 'like', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->value('invoice_number');

        if (!$last) {
            return $prefix . '0001';
        }

        $sequence = (int) substr($last, -4);
        return $prefix . str_pad((string) ($sequence + 1), 4, '0', STR_PAD_LEFT);
    }
}
