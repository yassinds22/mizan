<?php

declare(strict_types=1);

namespace App\Domains\Core\Exceptions;

use DomainException;

class FiscalPeriodClosedException extends DomainException
{
    public function __construct(
        string $date,
        string $status = 'closed',
        string $message = ''
    ) {
        if (empty($message)) {
            $statusLabel = match ($status) {
                'closed' => 'مغلقة',
                'locked' => 'مجمدة نهائياً',
                default => 'غير متاحة للترحيل',
            };

            $message = "لا يمكن ترحيل أو تعديل أي حركة مالية في التاريخ ({$date}) لأن الفترة المحاسبية {$statusLabel}.";
        }

        parent::__construct($message, 422);
    }

    public function render($request)
    {
        return response()->json([
            'message' => $this->getMessage(),
            'errors' => [
                'date' => [$this->getMessage()],
            ],
        ], 422);
    }
}
