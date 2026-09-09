<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Contracts;

use App\Domains\Core\Models\SystemSetting;
use Illuminate\Database\Eloquent\Collection;

interface SettingRepositoryInterface
{
    /**
     * @return Collection<int, SystemSetting>
     */
    public function all(): Collection;

    /**
     * @return array<string, string|null>
     */
    public function allAsKeyValue(): array;

    public function get(string $key, ?string $default = null): ?string;

    public function set(string $key, ?string $value, string $group = 'general'): SystemSetting;

    /**
     * @param array<string, array{value: string|null, group?: string}>|array<string, string|null> $settings
     * @return array<string, string|null>
     */
    public function saveMany(array $settings): array;
}
