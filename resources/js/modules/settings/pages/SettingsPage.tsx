import React, { useState } from "react";
import { Save } from "lucide-react";
import { PrintCenterPage } from "@/modules/settings/pages/PrintCenterPage";

export const SettingsPage: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);

  const save = () => {
    setToast("تم حفظ إعدادات الشركة بنجاح");
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>بيانات المنشأة</h3>
            <p>تظهر في الفواتير والتقارير المطبوعة</p>
          </div>
          <button className="btn btn-primary" onClick={save}>
            <Save size={15} /> حفظ
          </button>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <label className="label">
              الاسم التجاري
              <input defaultValue="ميزان للتجارة الغذائية" />
            </label>
            <label className="label">
              الرقم الضريبي
              <input defaultValue="310123456700003" />
            </label>
            <label className="label">
              السجل التجاري
              <input defaultValue="1010123456" />
            </label>
            <label className="label">
              المدينة
              <input defaultValue="الرياض" />
            </label>
            <label className="label full">
              العنوان
              <input defaultValue="حي الصناعية، طريق الخرج، الرياض" />
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>الضريبة والسنة المالية</h3>
              <p>تُطبَّق على الفواتير والإقفال</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                نسبة ضريبة القيمة المضافة %
                <input defaultValue="15" />
              </label>
              <label className="label">
                بداية السنة المالية
                <input type="date" defaultValue="2026-01-01" />
              </label>
              <label className="label">
                العملة
                <select defaultValue="SAR">
                  <option value="SAR">ريال سعودي</option>
                  <option value="AED">درهم إماراتي</option>
                </select>
              </label>
              <label className="label">
                سياسة المخزون
                <select defaultValue="FEFO">
                  <option>متوسط التكلفة المرجح</option>
                  <option>FEFO</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>قالب الطباعة</h3>
              <p>رأس وتذييل موحّدان لكل المستندات</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="label">
                شعار (نصي)
                <input defaultValue="ميزان" />
              </label>
              <label className="label">
                تذييل الفاتورة
                <input defaultValue="شكراً لتعاملكم معنا" />
              </label>
              <label className="label full">
                ملاحظة قانونية
                <textarea defaultValue="فاتورة ضريبية مبسطة وفق أنظمة هيئة الزكاة والضريبة والجمارك." />
              </label>
            </div>
          </div>
        </section>
      </div>

      <PrintCenterPage />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
