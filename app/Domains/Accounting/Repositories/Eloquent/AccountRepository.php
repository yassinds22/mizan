<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Repositories\Eloquent;

use App\Domains\Accounting\Enums\AccountType;
use App\Domains\Accounting\Models\Account;
use App\Domains\Accounting\Repositories\Contracts\AccountRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class AccountRepository implements AccountRepositoryInterface
{
    public function all(array $filters = []): Collection
    {
        $query = Account::query()->with('parent');

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', $search)
                  ->orWhere('name_ar', 'like', $search)
                  ->orWhere('name_en', 'like', $search);
            });
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type'] instanceof AccountType ? $filters['type']->value : $filters['type']);
        }

        if (isset($filters['is_leaf'])) {
            $query->where('is_leaf', (bool) $filters['is_leaf']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        return $query->orderBy('code')->get();
    }

    public function getTree(): Collection
    {
        return Account::query()
            ->whereNull('parent_id')
            ->with(['children.children.children']) // Deep eager load up to 4 levels
            ->orderBy('code')
            ->get();
    }

    public function findById(int $id): ?Account
    {
        return Account::with(['parent', 'children'])->find($id);
    }

    public function findByCode(string $code): ?Account
    {
        return Account::with(['parent', 'children'])->where('code', $code)->first();
    }

    public function create(array $data): Account
    {
        return Account::create($data);
    }

    public function update(Account $account, array $data): Account
    {
        $account->update($data);
        return $account->fresh(['parent', 'children']);
    }

    public function delete(Account $account): bool
    {
        return (bool) $account->delete();
    }

    public function getLeafAccounts(): Collection
    {
        return Account::query()
            ->where('is_leaf', true)
            ->where('is_active', true)
            ->orderBy('code')
            ->get();
    }
}
