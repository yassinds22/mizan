<?php

declare(strict_types=1);

namespace App\Domains\Warehouses\Services;

use App\Domains\Warehouses\Enums\WarehouseType;
use App\Domains\Warehouses\Models\Warehouse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class WarehouseService
{
    /**
     * جلب قائمة المستودعات مع التصفية والبحث
     */
    public function listWarehouses(?int $branchId = null, ?bool $isActive = null, ?string $search = null): Collection
    {
        $query = Warehouse::query()->with('branch');

        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        if ($isActive !== null) {
            $query->where('is_active', $isActive);
        }

        if ($search !== null && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('code', 'like', $term);
            });
        }

        return $query->orderBy('code')->get();
    }

    /**
     * جلب مستودع محدد
     */
    public function findWarehouse(int $id): Warehouse
    {
        return Warehouse::with('branch')->findOrFail($id);
    }

    /**
     * إنشاء مستودع جديد
     */
    public function createWarehouse(array $data): Warehouse
    {
        // التحقق من نوع المستودع وتعيين درجات الحرارة الافتراضية إذا لم تُحدد
        if (isset($data['type'])) {
            $typeEnum = $data['type'] instanceof WarehouseType ? $data['type'] : WarehouseType::from($data['type']);
            if (empty($data['temp_range'])) {
                $data['temp_range'] = $typeEnum->defaultTempRange();
            }
        }

        // توليد كود تلقائي إذا لم يُحدد
        if (empty($data['code'])) {
            $count = Warehouse::count() + 1;
            $data['code'] = sprintf('WH-%02d', $count);
        }

        return Warehouse::create($data);
    }

    /**
     * تحديث بيانات مستودع
     */
    public function updateWarehouse(int $id, array $data): Warehouse
    {
        $warehouse = $this->findWarehouse($id);

        if (isset($data['type']) && empty($data['temp_range'])) {
            $typeEnum = $data['type'] instanceof WarehouseType ? $data['type'] : WarehouseType::from($data['type']);
            $data['temp_range'] = $typeEnum->defaultTempRange();
        }

        $warehouse->update($data);

        return $warehouse->fresh(['branch']);
    }

    /**
     * حذف أو تعطيل مستودع
     */
     public function deleteWarehouse(int $id): bool
     {
         $warehouse = $this->findWarehouse($id);
         return (bool) $warehouse->delete();
     }

    /**
     * جلب مواقع مستودع محدد
     */
    public function listLocations(int $warehouseId, ?bool $isActive = null): Collection
    {
        $query = \App\Domains\Warehouses\Models\WarehouseLocation::where('warehouse_id', $warehouseId);

        if ($isActive !== null) {
            $query->where('is_active', $isActive);
        }

        return $query->orderBy('code')->get();
    }

    /**
     * جلب موقع محدد
     */
    public function findLocation(int $locationId): \App\Domains\Warehouses\Models\WarehouseLocation
    {
        return \App\Domains\Warehouses\Models\WarehouseLocation::findOrFail($locationId);
    }

    /**
     * إنشاء موقع جديد داخل المستودع
     */
    public function createLocation(int $warehouseId, array $data): \App\Domains\Warehouses\Models\WarehouseLocation
    {
        $warehouse = $this->findWarehouse($warehouseId);

        if (empty($data['code'])) {
            $count = $warehouse->locations()->count() + 1;
            $data['code'] = sprintf('LOC-%02d', $count);
        }

        return $warehouse->locations()->create($data);
    }

    /**
     * تحديث بيانات موقع
     */
    public function updateLocation(int $locationId, array $data): \App\Domains\Warehouses\Models\WarehouseLocation
    {
        $location = $this->findLocation($locationId);
        $location->update($data);

        return $location->fresh();
    }

    /**
     * حذف موقع
     */
    public function deleteLocation(int $locationId): bool
    {
        $location = $this->findLocation($locationId);
        return (bool) $location->delete();
    }
}
