<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Repositories\Eloquent;

use App\Domains\Accounting\Models\JournalEntry;
use App\Domains\Accounting\Repositories\Contracts\JournalEntryRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class JournalEntryRepository implements JournalEntryRepositoryInterface
{
    public function paginate(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return $this->applyFilters($filters)
            ->with(['branch', 'fiscalPeriod'])
            ->latest('date')
            ->latest('id')
            ->paginate($perPage);
    }

    public function all(array $filters = []): Collection
    {
        return $this->applyFilters($filters)
            ->with(['branch', 'fiscalPeriod'])
            ->latest('date')
            ->latest('id')
            ->get();
    }

    public function findById(int $id, array $with = ['lines.account', 'lines.costCenter', 'branch', 'fiscalPeriod']): ?JournalEntry
    {
        return JournalEntry::with($with)->find($id);
    }

    public function findByEntryNumber(string $entryNumber): ?JournalEntry
    {
        return JournalEntry::with(['lines.account', 'lines.costCenter', 'branch', 'fiscalPeriod'])
            ->where('entry_number', $entryNumber)
            ->first();
    }

    public function create(array $data): JournalEntry
    {
        return JournalEntry::create($data);
    }

    public function update(JournalEntry $entry, array $data): JournalEntry
    {
        $entry->update($data);
        return $entry->fresh(['lines.account', 'branch', 'fiscalPeriod']);
    }

    public function delete(JournalEntry $entry): bool
    {
        return (bool) $entry->delete();
    }

    public function generateNextEntryNumber(string $prefix = 'JE', ?int $year = null): string
    {
        $year = $year ?? (int) Carbon::now()->format('Y');
        $prefixWithYear = "{$prefix}-{$year}-";

        return DB::transaction(function () use ($prefixWithYear) {
            $last = JournalEntry::where('entry_number', 'like', "{$prefixWithYear}%")
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();

            $nextSequence = 1;
            if ($last) {
                $lastNumber = str_replace($prefixWithYear, '', $last->entry_number);
                if (is_numeric($lastNumber)) {
                    $nextSequence = ((int) $lastNumber) + 1;
                }
            }

            return sprintf('%s%05d', $prefixWithYear, $nextSequence);
        });
    }

    private function applyFilters(array $filters): Builder
    {
        $query = JournalEntry::query();

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['source_type'])) {
            $query->where('source_type', $filters['source_type']);
        }

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (!empty($filters['fiscal_period_id'])) {
            $query->where('fiscal_period_id', $filters['fiscal_period_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('date', '<=', $filters['date_to']);
        }

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function (Builder $q) use ($search) {
                $q->where('entry_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('source_reference', 'like', "%{$search}%");
            });
        }

        return $query;
    }
}
