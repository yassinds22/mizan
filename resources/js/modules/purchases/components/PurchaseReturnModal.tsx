import React from "react";
import {
  PartyReturnModal,
  ReturnableDocumentData,
} from "@/components/common/PartyReturnModal";
import { purchasesApi, PurchaseReturn } from "@/api/purchases";

export interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  onSuccess: (purchaseReturn: PurchaseReturn) => void;
}

export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onSuccess,
}) => {
  const fetchReturnableLines = async (id: number): Promise<ReturnableDocumentData> => {
    const data = await purchasesApi.getReturnableLines(id);
    return {
      document_number: data.invoice_number,
      party_name: data.supplier_name || "مورد عام",
      payment_method: data.payment_method,
      lines: data.lines.map((l) => ({
        line_id: l.purchase_invoice_line_id,
        item_id: l.item_id,
        item_name_ar: l.item_name_ar,
        item_sku: l.item_sku,
        unit_name: l.unit_name,
        original_quantity: l.original_quantity,
        already_returned_quantity: l.already_returned_quantity,
        remaining_quantity: l.remaining_quantity,
        quantity_to_return: 0,
        unit_price: l.unit_price,
        tax_rate: l.tax_rate,
      })),
    };
  };

  const onSubmitReturn = async (payload: {
    document_id: number;
    return_date: string;
    refund_method: "cash" | "credit" | "bank_transfer";
    reason: string;
    lines: { line_id: number; quantity: number }[];
  }) => {
    return await purchasesApi.createPurchaseReturn({
      purchase_invoice_id: payload.document_id,
      return_date: payload.return_date,
      refund_method: payload.refund_method,
      reason: payload.reason,
      lines: payload.lines.map((l) => ({
        purchase_invoice_line_id: l.line_id,
        quantity: l.quantity,
      })),
    });
  };

  return (
    <PartyReturnModal
      isOpen={isOpen}
      onClose={onClose}
      documentId={invoiceId}
      partyType="supplier"
      fetchReturnableLines={fetchReturnableLines}
      onSubmitReturn={onSubmitReturn}
      onSuccess={onSuccess}
    />
  );
};
