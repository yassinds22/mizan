<?php

declare(strict_types=1);

namespace App\Domains\Sales\Services;

class ZatcaQrService
{
    /**
     * Generate ZATCA Phase 1 / Phase 2 TLV Base64 QR payload
     *
     * @param string $sellerName Tag 1
     * @param string $vatNumber Tag 2 (15 digits)
     * @param string $timestamp Tag 3 (ISO8601 string)
     * @param string $invoiceTotal Tag 4 (Total including VAT formatted to 2 decimals)
     * @param string $vatTotal Tag 5 (Total VAT formatted to 2 decimals)
     */
    public function generateTlvQr(
        string $sellerName,
        string $vatNumber,
        string $timestamp,
        string $invoiceTotal,
        string $vatTotal
    ): string {
        $tlv = '';
        $tlv .= $this->buildTlvTag(1, $sellerName);
        $tlv .= $this->buildTlvTag(2, $vatNumber);
        $tlv .= $this->buildTlvTag(3, $timestamp);
        $tlv .= $this->buildTlvTag(4, $invoiceTotal);
        $tlv .= $this->buildTlvTag(5, $vatTotal);

        return base64_encode($tlv);
    }

    private function buildTlvTag(int $tag, string $value): string
    {
        $length = strlen($value);
        return chr($tag) . chr($length) . $value;
    }
}
