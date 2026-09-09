<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Products;

use App\Domains\Products\Enums\PriceTier;
use App\Domains\Products\Services\ItemService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Products\StoreItemRequest;
use App\Http\Requests\Api\V1\Products\UpdateItemRequest;
use App\Http\Resources\Api\V1\Products\ItemPriceResource;
use App\Http\Resources\Api\V1\Products\ItemResource;
use App\Http\Resources\Api\V1\Products\ItemUnitResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ItemController extends Controller
{
    public function __construct(
        protected ItemService $itemService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only([
            'search',
            'category_id',
            'storage_condition',
            'is_active',
            'is_perishable',
        ]);

        $perPage = (int) $request->input('per_page', 25);
        $items = $this->itemService->listItems($filters, $perPage);

        return ItemResource::collection($items);
    }

    public function store(StoreItemRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $units = $validated['units'] ?? [];
        unset($validated['units']);

        // Flatten prices if nested in units
        $prices = [];
        foreach ($units as &$u) {
            if (!empty($u['prices'])) {
                foreach ($u['prices'] as $p) {
                    $p['uom_id'] = $u['uom_id'];
                    $prices[] = $p;
                }
                unset($u['prices']);
            }
        }
        unset($u);

        $item = $this->itemService->createItem($validated, $units, $prices);

        return (new ItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): ItemResource
    {
        $item = $this->itemService->getItem($id);

        return new ItemResource($item);
    }

    public function update(UpdateItemRequest $request, int $id): ItemResource
    {
        $validated = $request->validated();
        $units = $validated['units'] ?? null;
        unset($validated['units']);

        $prices = null;
        if ($units !== null) {
            $prices = [];
            foreach ($units as &$u) {
                if (!empty($u['prices'])) {
                    foreach ($u['prices'] as $p) {
                        $p['item_unit_id'] = $u['id'] ?? null;
                        $p['uom_id'] = $u['uom_id'];
                        $prices[] = $p;
                    }
                    unset($u['prices']);
                }
            }
            unset($u);
        }

        $item = $this->itemService->updateItem($id, $validated, $units, $prices);

        return new ItemResource($item);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->itemService->deleteItem($id);

        return response()->json([
            'message' => 'تم حذف الصنف بنجاح.',
        ]);
    }

    /**
     * البحث عن صنف بواسطة الباركود (باركود الصنف أو باركود أي من وحداته المتعددة)
     */
    public function findByBarcode(string $barcode): JsonResponse
    {
        $item = $this->itemService->getItemByBarcode($barcode);

        if (!$item) {
            return response()->json([
                'message' => 'لم يتم العثور على صنف مطابق لهذا الباركود.',
            ], 404);
        }

        $matchedUnit = $item->findUnitByBarcode($barcode) ?? $item->itemUnits->firstWhere('is_base_unit', true);

        return response()->json([
            'item' => new ItemResource($item),
            'matched_unit' => $matchedUnit ? new ItemUnitResource($matchedUnit) : null,
        ]);
    }

    /**
     * تحويل كمية بين وحدتين للصنف
     */
    public function convertQuantity(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'from_uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'to_uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
        ]);

        $converted = $this->itemService->convertQuantity(
            $id,
            (float) $request->input('quantity'),
            (int) $request->input('from_uom_id'),
            (int) $request->input('to_uom_id')
        );

        return response()->json([
            'original_quantity' => (float) $request->input('quantity'),
            'converted_quantity' => (float) $converted,
        ]);
    }

    /**
     * استخراج السعر المعتمد للصنف بناءً على الوحدة والشريحة والكمية
     */
    public function resolvePrice(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'price_tier' => ['nullable', 'string'],
            'quantity' => ['nullable', 'numeric', 'min:1'],
        ]);

        $tier = $request->input('price_tier', PriceTier::Retail->value);
        $qty = (float) $request->input('quantity', 1.0);

        $price = $this->itemService->resolvePrice($id, (int) $request->input('uom_id'), $tier, $qty);

        if (!$price) {
            return response()->json([
                'message' => 'لا يوجد تسعيرة محددة لهذه الشريحة والوحدة.',
            ], 404);
        }

        return response()->json([
            'price' => new ItemPriceResource($price),
        ]);
    }
}
