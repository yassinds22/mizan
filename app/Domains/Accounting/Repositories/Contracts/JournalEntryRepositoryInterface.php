<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Repositories\Contracts;

use App\Domains\Accounting\Models\JournalEntry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface JournalEntryRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     */
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator;

    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, JournalEntry>
     */
    public function all(array $filters = []): Collection;

    public function findById(int $id, array $with = ['lines.account', 'lines.costCenter', 'branch', 'fiscalPeriod']): ?JournalEntry;

    public function findByEntryNumber(string $entryNumber): ?JournalEntry;

    public function create(array $data): JournalEntry;

    public function update(JournalEntry $entry, array $data): JournalEntry;

    public function delete(JournalEntry $entry): bool;

    public function generateNextEntryNumber(string $prefix = 'JE', ?int $year = null): string;
}
