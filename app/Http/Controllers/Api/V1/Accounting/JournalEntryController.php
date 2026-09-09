<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Accounting;

use App\Domains\Accounting\Services\JournalService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Accounting\ReverseJournalEntryRequest;
use App\Http\Requests\Api\V1\Accounting\StoreJournalEntryRequest;
use App\Http\Requests\Api\V1\Accounting\UpdateJournalEntryRequest;
use App\Http\Resources\Api\V1\Accounting\JournalEntryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class JournalEntryController extends Controller
{
    public function __construct(
        protected JournalService $journalService
    ) {}

    /**
     * عرض قائمة قيود اليومية مفلترة مع التصفح بالصفحات
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only([
            'status',
            'source_type',
            'branch_id',
            'fiscal_period_id',
            'date_from',
            'date_to',
            'search',
        ]);

        $perPage = (int) $request->input('per_page', 25);
        $entries = $this->journalService->listEntries($filters, $perPage);

        return JournalEntryResource::collection($entries);
    }

    /**
     * إنشاء قيد يومية جديد (مسودة أو مرحل مباشرة)
     */
    public function store(StoreJournalEntryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $lines = $data['lines'] ?? [];
        unset($data['lines']);

        $userId = $request->user()?->id;
        $postNow = $request->boolean('post_now', false);

        if ($postNow) {
            $entry = $this->journalService->createAndPost($data, $lines, $userId);
        } else {
            $data['created_by'] = $userId;
            $entry = $this->journalService->createDraft($data, $lines);
        }

        return (new JournalEntryResource($entry))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * عرض تفاصيل قيد يومية محدد بكامل أسطره
     */
    public function show(int $id): JournalEntryResource
    {
        $entry = $this->journalService->getEntry($id);

        return new JournalEntryResource($entry);
    }

    /**
     * تحديث مسودة قيد يومية (مسموح فقط في حالة Draft)
     */
    public function update(UpdateJournalEntryRequest $request, int $id): JournalEntryResource
    {
        $data = $request->validated();
        $lines = array_key_exists('lines', $data) ? $data['lines'] : null;
        unset($data['lines']);

        $entry = $this->journalService->updateDraft($id, $data, $lines);

        return new JournalEntryResource($entry);
    }

    /**
     * حذف مسودة قيد يومية (مسموح فقط في حالة Draft)
     */
    public function destroy(int $id): JsonResponse
    {
        $this->journalService->deleteDraft($id);

        return response()->json([
            'message' => 'تم حذف مسودة القيد بنجاح.',
        ]);
    }

    /**
     * ترحيل قيد يومية معتمد
     */
    public function post(Request $request, int $id): JournalEntryResource
    {
        $userId = $request->user()?->id;
        $entry = $this->journalService->postEntry($id, $userId);

        return new JournalEntryResource($entry);
    }

    /**
     * عكس قيد يومية مرحّل وإنشاء قيد عكسي مطابق
     */
    public function reverse(ReverseJournalEntryRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();
        $userId = $request->user()?->id;

        $reversalEntry = $this->journalService->reverseEntry(
            $id,
            $validated['reason'],
            $validated['reversal_date'] ?? null,
            $userId
        );

        return (new JournalEntryResource($reversalEntry))
            ->response()
            ->setStatusCode(201);
    }
}
