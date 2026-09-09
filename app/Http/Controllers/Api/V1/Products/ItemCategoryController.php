<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Products;

use App\Domains\Products\Services\ItemCategoryService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Products\StoreItemCategoryRequest;
use App\Http\Requests\Api\V1\Products\UpdateItemCategoryRequest;
use App\Http\Resources\Api\V1\Products\ItemCategoryResource;
use App\Http\Resources\Api\V1\Products\ItemCategoryTreeResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ItemCategoryController extends Controller
{
    public function __construct(
        protected ItemCategoryService $categoryService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $categories = $this->categoryService->listCategories($request->all());

        return ItemCategoryResource::collection($categories);
    }

    public function tree(): AnonymousResourceCollection
    {
        $tree = $this->categoryService->getTree();

        return ItemCategoryTreeResource::collection($tree);
    }

    public function store(StoreItemCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->createCategory($request->validated());

        return (new ItemCategoryResource($category))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): ItemCategoryResource
    {
        $category = $this->categoryService->getCategory($id);

        return new ItemCategoryResource($category);
    }

    public function update(UpdateItemCategoryRequest $request, int $id): ItemCategoryResource
    {
        $category = $this->categoryService->updateCategory($id, $request->validated());

        return new ItemCategoryResource($category);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->categoryService->deleteCategory($id);

        return response()->json([
            'message' => 'تم حذف تصنيف الأصناف بنجاح.',
        ]);
    }
}
