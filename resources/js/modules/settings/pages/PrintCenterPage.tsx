import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { trialBalanceRows } from "@/data/accounting";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/utils/formatters";
import { coreApi } from "@/api/core";

export const PrintCenterPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("ميزان للتجارة الغذائية");
  const [taxNumber, setTaxNumber] = useState("310123456700003");
  const [branchName, setBranchName] = useState("الفرع الرئيسي");

  const debit = trialBalanceRows.reduce((s, r) => s + r.debit, 0);
  const credit = trialBalanceRows.reduce((s, r) => s + r.credit, 0);

  useEffect(() => {
    coreApi.getSettings().then((s) => {
      if (s.company_name) setCompanyName(s.company_name);
      if (s.tax_number) setTaxNumber(s.tax_number);
    }).catch(() => {});

    coreApi.getBranches({ is_active: true }).then((branches) => {
      if (branches && branches.length > 0) {
        setBranchName(branches[0].name);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>مركز الطباعة الموحّد</h3>
            <p>نفس الرأس والتذييل للفواتير والتقارير</p>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Printer size={15} /> معاينة ميزان المراجعة
          </button>
        </div>
        <div className="panel-body">
          <p
            style={{
              margin: 0,
              color: "var(--ink-soft)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            استخدم هذا القالب من الفواتير والتقارير. الإعدادات تُدار من شاشة إعدادات الشركة.
          </p>
        </div>
      </section>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="معاينة طباعة — ميزان المراجعة"
        subtitle="حتى 2026-09-04"
        footer={
          <button className="btn btn-primary" onClick={() => setOpen(false)}>
            <Printer size={15} /> طباعة
          </button>
        }
      >
        <div className="print-sheet">
          <header>
            <strong>{companyName}</strong>
            <span>الرقم الضريبي {taxNumber}</span>
          </header>
          <p>{branchName} · السنة المالية 2026</p>
          <ul>
            {trialBalanceRows.slice(0, 6).map((r) => (
              <li key={r.code}>
                {r.code} {r.name} — مدين {money(r.debit)} / دائن {money(r.credit)}
              </li>
            ))}
          </ul>
          <p>
            الإجمالي: مدين {money(debit)} · دائن {money(credit)}
          </p>
          <footer>
            <span>فاتورة / تقرير وفق قالب الشركة الموحّد</span>
            <strong>{branchName}</strong>
          </footer>
        </div>
      </Modal>
    </div>
  );
};
