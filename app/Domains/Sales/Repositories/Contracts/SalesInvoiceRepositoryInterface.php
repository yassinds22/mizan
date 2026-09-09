<?php

declare(strict_types=1);

namespace App\Domains\Sales\Repositories\Contracts;

use App\Domains\Sales\Models\SalesInvoice;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface SalesInvoiceRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     */
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator;

    public function findById(int $id): ?SalesInvoice;

    public function findByNumber(string $invoiceNumber): ?SalesInvoice;

    /**
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $lines
     */
    public function create(array $data, array $lines = []): SalesInvoice;

    /**
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>>|null $lines
     */
    public function update(SalesInvoice $invoice, array $data, ?array $lines = null): SalesInvoice;

    public function delete(SalesInvoice $invoice): bool;

    public function generateNextInvoiceNumber(string $date): string;
}
