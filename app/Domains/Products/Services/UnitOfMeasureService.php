<?php

declare(strict_types=1);

namespace App\Domains\Products\Services;

use App\Domains\Products\Models\UnitOfMeasure;
use App\Domains\Products\Repositories\Contracts\UnitOfMeasureRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class UnitOfMeasureService
{
    public function __construct(
        private readonly UnitOfMeasureRepositoryInterface $uomRepository
    ) {}

    public function listUnits(array $filters = []): Collection
    {
        return $this->uomRepository->all($filters);
    }

    public function getUnit(int $id): UnitOfMeasure
    {
        $uom = $this->uomRepository->findById($id);

        if (!$uom) {
            throw ValidationException::withMessages([
                'uom' => ["وحدة القياس المطلوبة غير موجودة (معرف: {$id})."],
            ]);
        }

        return $uom;
    }

    public function createUnit(array $data): UnitOfMeasure
    {
        $code = strtoupper(trim($data['code']));

        if ($this->uomRepository->findByCode($code)) {
            throw ValidationException::withMessages([
                'code' => ["كود وحدة القياس [{$code}] مسجل مسبقاً."],
            ]);
        }

        $data['code'] = $code;
        return $this->uomRepository->create($data);
    }

    public function updateUnit(int $id, array $data): UnitOfMeasure
    {
        $uom = $this->getUnit($id);

        if (!empty($data['code'])) {
            $code = strtoupper(trim($data['code']));
            $existing = $this->uomRepository->findByCode($code);
            if ($existing && $existing->id !== $uom->id) {
                throw ValidationException::withMessages([
                    'code' => ["كود وحدة القياس [{$code}] مسجل مسبقاً لوحدة أخرى."],
                ]);
            }
            $data['code'] = $code;
        }

        return $this->uomRepository->update($uom, $data);
    }

    public function deleteUnit(int $id): bool
    {
        $uom = $this->getUnit($id);

        if ($uom->items()->exists() || $uom->itemUnits()->exists()) {
            throw ValidationException::withMessages([
                'uom' => ['لا يمكن حذف وحدة القياس لأنها مستخدمة في أصناف وبطاقات منتجات حالية.'],
            ]);
        }

        return $this->uomRepository->delete($uom);
    }
}
