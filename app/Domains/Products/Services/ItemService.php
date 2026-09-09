<?php

declare(strict_types=1);

namespace App\Domains\Products\Services;

use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Enums\StorageCondition;
use App\Domains\Products\Models\Item;
use App\Domains\Products\Models\ItemPrice;
use App\Domains\Products\Models\ItemUnit;
use App\Domains\Products\Repositories\Contracts\ItemRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ItemService
{
    public function __construct(
        private readonly ItemRepositoryInterface $itemRepository,
        private readonly UnitOfMeasureService $uomService,
        private readonly ItemCategoryService $categoryService
    ) {}

    public function listItems(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return $this->itemRepository->paginate($filters, $perPage);
    }

    public function allItems(array $filters = []): Collection
    {
        return $this->itemRepository->all($filters);
    }

    public function getItem(int $id): Item
    {
        $item = $this->itemRepository->findById($id);

        if (!$item) {
            throw ValidationException::withMessages([
                'item' => ["الصنف الغذائي غير موجود (معرف: {$id})."],
            ]);
        }

        return $item;
    }

    public function getItemBySku(string $sku): Item
    {
        $item = $this->itemRepository->findBySku($sku);

        if (!$item) {
            throw ValidationException::withMessages([
                'sku' => ["الصنف ذو الكود [{$sku}] غير موجود في النظام."],
            ]);
        }

        return $item;
    }

    public function getItemByBarcode(string $barcode): ?Item
    {
        return $this->itemRepository->findByBarcode($barcode);
    }

    /**
     * إنشاء صنف جديد مع وحداته المتعددة وأسعاره في معاملة واحدة متكاملة
     *
     * @param array<string, mixed> $itemData
     * @param array<int, array<string, mixed>> $units
     * @param array<int, array<string, mixed>> $prices
     */
    public function createItem(array $itemData, array $units = [], array $prices = []): Item
    {
        return DB::transaction(function () use ($itemData, $units, $prices) {
            $sku = strtoupper(trim($itemData['sku']));

            if ($this->itemRepository->findBySku($sku)) {
                throw ValidationException::withMessages([
                    'sku' => ["كود الصنف [{$sku}] مسجل مسبقاً، يجب أن يكون الكود فريداً."],
                ]);
            }
            $itemData['sku'] = $sku;

            // التحقق من صحة التصنيف والوحدة الأساسية
            $this->categoryService->getCategory((int) $itemData['category_id']);
            $baseUom = $this->uomService->getUnit((int) $itemData['base_uom_id']);

            if (isset($itemData['storage_condition']) && is_string($itemData['storage_condition'])) {
                $itemData['storage_condition'] = StorageCondition::from($itemData['storage_condition']);
            }

            // 1. إنشاء الصنف الرئيسي
            $item = $this->itemRepository->create($itemData);

            // 2. ضمان وجود الوحدة الأساسية للصنف دائماً
            $hasBaseUnit = false;
            $unitMap = []; // uom_id => ItemUnit

            foreach ($units as $u) {
                $uomId = (int) $u['uom_id'];
                $isBase = !empty($u['is_base_unit']) || $uomId === $baseUom->id;
                $factor = $isBase ? '1.0000' : (string) ($u['conversion_factor'] ?? '1.0000');

                if ($isBase) {
                    $hasBaseUnit = true;
                }

                $createdUnit = ItemUnit::create([
                    'item_id' => $item->id,
                    'uom_id' => $uomId,
                    'conversion_factor' => $factor,
                    'barcode' => !empty($u['barcode']) ? trim((string) $u['barcode']) : null,
                    'is_base_unit' => $isBase,
                ]);

                $unitMap[$uomId] = $createdUnit;
            }

            // إذا لم يتم تضمين الوحدة الأساسية في مصفوفة الوحدات، ننشئها تلقائياً
            if (!$hasBaseUnit) {
                $baseItemUnit = ItemUnit::create([
                    'item_id' => $item->id,
                    'uom_id' => $baseUom->id,
                    'conversion_factor' => '1.0000',
                    'barcode' => $item->barcode,
                    'is_base_unit' => true,
                ]);
                $unitMap[$baseUom->id] = $baseItemUnit;
            }

            // 3. إنشاء شرائح الأسعار للوحدات
            foreach ($prices as $p) {
                $targetUnit = null;
                if (!empty($p['item_unit_id'])) {
                    $targetUnit = ItemUnit::find((int) $p['item_unit_id']);
                } elseif (!empty($p['uom_id']) && isset($unitMap[(int) $p['uom_id']])) {
                    $targetUnit = $unitMap[(int) $p['uom_id']];
                }

                if ($targetUnit && isset($p['price'])) {
                    $tier = $p['price_tier'] ?? PriceTier::Retail->value;
                    $tierEnum = $tier instanceof PriceTier ? $tier : PriceTier::from((string) $tier);

                    ItemPrice::updateOrCreate(
                        [
                            'item_unit_id' => $targetUnit->id,
                            'price_tier' => $tierEnum,
                        ],
                        [
                            'price' => (string) $p['price'],
                            'min_quantity' => (string) ($p['min_quantity'] ?? '1.0000'),
                            'is_active' => true,
                        ]
                    );
                }
            }

            return $this->getItem($item->id);
        });
    }

    /**
     * تحديث بيانات الصنف ووحداته وأسعاره
     *
     * @param array<string, mixed> $itemData
     * @param array<int, array<string, mixed>>|null $units
     * @param array<int, array<string, mixed>>|null $prices
     */
    public function updateItem(int $id, array $itemData, ?array $units = null, ?array $prices = null): Item
    {
        return DB::transaction(function () use ($id, $itemData, $units, $prices) {
            $item = $this->getItem($id);

            if (!empty($itemData['sku'])) {
                $sku = strtoupper(trim($itemData['sku']));
                $existing = $this->itemRepository->findBySku($sku);
                if ($existing && $existing->id !== $item->id) {
                    throw ValidationException::withMessages([
                        'sku' => ["كود الصنف [{$sku}] مسجل مسبقاً لصنف آخر."],
                    ]);
                }
                $itemData['sku'] = $sku;
            }

            if (isset($itemData['storage_condition']) && is_string($itemData['storage_condition'])) {
                $itemData['storage_condition'] = StorageCondition::from($itemData['storage_condition']);
            }

            $updatedItem = $this->itemRepository->update($item, $itemData);

            // تحديث الوحدات إن تم تمريرها
            if ($units !== null) {
                $existingUnitIds = $item->itemUnits->pluck('id')->toArray();
                $processedUnitIds = [];

                foreach ($units as $u) {
                    $uomId = (int) $u['uom_id'];
                    $isBase = !empty($u['is_base_unit']) || $uomId === $updatedItem->base_uom_id;
                    $factor = $isBase ? '1.0000' : (string) ($u['conversion_factor'] ?? '1.0000');

                    $itemUnit = ItemUnit::updateOrCreate(
                        [
                            'item_id' => $updatedItem->id,
                            'uom_id' => $uomId,
                        ],
                        [
                            'conversion_factor' => $factor,
                            'barcode' => !empty($u['barcode']) ? trim((string) $u['barcode']) : null,
                            'is_base_unit' => $isBase,
                        ]
                    );

                    $processedUnitIds[] = $itemUnit->id;
                }

                // حذف الوحدات التي أزيلت (بشرط ألا تكون الوحدة الأساسية)
                $toDelete = array_diff($existingUnitIds, $processedUnitIds);
                foreach ($toDelete as $delId) {
                    $delUnit = ItemUnit::find($delId);
                    if ($delUnit && !$delUnit->is_base_unit) {
                        $delUnit->delete();
                    }
                }
            }

            // تحديث الأسعار إن تم تمريرها
            if ($prices !== null) {
                foreach ($prices as $p) {
                    if (!empty($p['item_unit_id']) && isset($p['price'])) {
                        $tier = $p['price_tier'] ?? PriceTier::Retail->value;
                        $tierEnum = $tier instanceof PriceTier ? $tier : PriceTier::from((string) $tier);

                        ItemPrice::updateOrCreate(
                            [
                                'item_unit_id' => (int) $p['item_unit_id'],
                                'price_tier' => $tierEnum,
                            ],
                            [
                                'price' => (string) $p['price'],
                                'min_quantity' => (string) ($p['min_quantity'] ?? '1.0000'),
                                'is_active' => true,
                            ]
                        );
                    }
                }
            }

            return $this->getItem($updatedItem->id);
        });
    }

    public function deleteItem(int $id): bool
    {
        $item = $this->getItem($id);
        return $this->itemRepository->delete($item);
    }

    /**
     * تحويل كمية بين وحدتين لنفس الصنف
     */
    public function convertQuantity(Item|int $item, float|string $qty, int $fromUomId, int $toUomId): string
    {
        $itemModel = is_int($item) ? $this->getItem($item) : $item;
        return $itemModel->convertQuantity($qty, $fromUomId, $toUomId);
    }

    /**
     * استخراج سعر الوحدة والشريحة المناسبة للصنف
     */
    public function resolvePrice(
        Item|int $item,
        int $uomId,
        PriceTier|string $tier = PriceTier::Retail,
        float $quantity = 1.0
    ): ?ItemPrice {
        $itemModel = is_int($item) ? $this->getItem($item) : $item;
        $tierValue = $tier instanceof PriceTier ? $tier->value : $tier;

        $unit = $itemModel->findUnitByUomId($uomId);
        if (!$unit) {
            return null;
        }

        return $unit->prices
            ->where('price_tier.value', $tierValue)
            ->where('min_quantity', '<=', $quantity)
            ->sortByDesc('min_quantity')
            ->first();
    }
}
