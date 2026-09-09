<?php

declare(strict_types=1);

namespace App\Domains\Accounting\Repositories\Contracts;

use App\Domains\Accounting\Models\Account;
use Illuminate\Database\Eloquent\Collection;

interface AccountRepositoryInterface
{
    /**
     * @param array<string, mixed> $filters
     * @return Collection<int, Account>
     */
    public function all(array $filters = []): Collection;

    /**
     * جلب الشجرة المحاسبية كاملة من المستوى الجذري
     *
     * @return Collection<int, Account>
     */
    public function getTree(): Collection;

    public function findById(int $id): ?Account;

    public function findByCode(string $code): ?Account;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Account;

    /**
     * @param array<string, mixed> $data
     */
    public function update(Account $account, array $data): Account;

    public function delete(Account $account): bool;

    /**
     * الحسابات التحليلية فقط المسموح بالترحيل المباشر عليها
     *
     * @return Collection<int, Account>
     */
    public function getLeafAccounts(): Collection;
}
