import React, { useState } from "react";
import { PackageCheck, Receipt, X, Zap } from "lucide-react";

interface QuickActionsProps {
  onOpenQuickInvoice: () => void;
  onOpenQuickReceive: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenQuickInvoice,
  onOpenQuickReceive,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="quick-fab">
      {isOpen && (
        <div className="quick-menu">
          <div className="quick-menu-head">إجراء سريع</div>
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenQuickInvoice();
            }}
          >
            <Receipt size={16} />
            <div>
              <strong>فاتورة بيع سريعة</strong>
              <span>إنشاء فاتورة ببضع حقول</span>
            </div>
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenQuickReceive();
            }}
          >
            <PackageCheck size={16} />
            <div>
              <strong>استلام مخزون سريع</strong>
              <span>دفعة + صلاحية + مستودع</span>
            </div>
          </button>
        </div>
      )}
      <button
        className="quick-fab-btn"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={18} /> : <Zap size={18} />}
        {isOpen ? "إغلاق" : "إجراء سريع"}
      </button>
    </div>
  );
};
