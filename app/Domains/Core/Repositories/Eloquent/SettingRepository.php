<?php

declare(strict_types=1);

namespace App\Domains\Core\Repositories\Eloquent;

use App\Domains\Core\Models\SystemSetting;
use App\Domains\Core\Repositories\Contracts\SettingRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class SettingRepository implements SettingRepositoryInterface
{
    public function all(): Collection
    {
        return SystemSetting::all();
    }

    public function allAsKeyValue(): array
    {
        return SystemSetting::pluck('value', 'key')->toArray();
    }

    public function get(string $key, ?string $default = null): ?string
    {
        return SystemSetting::get($key, $default);
    }

    public function set(string $key, ?string $value, string $group = 'general'): SystemSetting
    {
        return SystemSetting::set($key, $value, $group);
    }

    public function saveMany(array $settings): array
    {
        foreach ($settings as $key => $val) {
            if (is_array($val) && array_key_exists('value', $val)) {
                $value = $val['value'] !== null ? (string) $val['value'] : null;
                $group = $val['group'] ?? 'general';
            } else {
                $value = $val !== null ? (string) $val : null;
                $group = 'general';
            }

            SystemSetting::set($key, $value, $group);
        }

        return $this->allAsKeyValue();
    }
}
