import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  Building,
  RotateCcw,
  Eye,
  Check,
  X,
  FileText,
} from "lucide-react";
import { BackBar } from "@/components/ui/BackBar";
import { money } from "@/utils/formatters";
import {
  accountingApi,
  AccountApi,
  CostCenterApi,
  JournalEntryApi,
  JournalStatusEnum,
} from "@/api/accounting";
import { coreApi, BranchApi } from "@/api/core";

interface JournalEntryPageProps {
  onBack: () => void;
}

interface LineRow {
  id: number;
  account_id: number;
  cost_center_id: number | null;
  debit: number;
  credit: number;
  description: string;
}

export const JournalEntryPage: React.FC<JournalEntryPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<"new" | "log">("new");

  // Lookup data
  const [leafAccounts, setLeafAccounts] = useState<AccountApi[]>([]);
  const [branches, setBranches] = useState<BranchApi[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterApi[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // New Entry Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [rows, setRows] = useState<LineRow[]>([
    { id: 1, account_id: 0, cost_center_id: null, debit: 0, credit: 0, description: "" },
    { id: 2, account_id: 0, cost_center_id: null, debit: 0, credit: 0, description: "" },
  ]);

  // Log Tab State
  const [entries, setEntries] = useState<JournalEntryApi[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [targetEntryToReverse, setTargetEntryToReverse] = useState<JournalEntryApi | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().split("T")[0]);
  const [reversalSubmitting, setReversalSubmitting] = useState(false);

  // View Details Modal State
  const [viewEntry, setViewEntry] = useState<JournalEntryApi | null>(null);

  // Load Lookups on mount
  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [accs, brs, ccs] = await Promise.all([
          accountingApi.getLeafAccounts(),
          coreApi.getBranches(),
          accountingApi.getCostCenters(),
        ]);
        setLeafAccounts(accs);
        setBranches(brs);
        setCostCenters(ccs);

        if (brs.length > 0) {
          setBranchId(brs[0].id);
        }

        // Default first two accounts if available (e.g. Cash and Sales)
        if (accs.length >= 2) {
          setRows([
            { id: 1, account_id: accs[0].id, cost_center_id: null, debit: 0, credit: 0, description: "" },
            { id: 2, account_id: accs[1].id, cost_center_id: null, debit: 0, credit: 0, description: "" },
          ]);
        }
      } catch (err) {
        console.error("Failed to load accounting lookups:", err);
      } finally {
        setLoadingLookups(false);
      }
    };

    loadLookups();
  }, []);

  // Load Entries log when tab changes to 'log'
  const loadEntries = async () => {
    setLoadingEntries(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const res = await accountingApi.getJournalEntries(params);
      setEntries(res.data);
    } catch (err) {
      console.error("Failed to load journal entries:", err);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (activeTab === "log") {
      loadEntries();
    }
  }, [activeTab, statusFilter]);

  // Calculations
  const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  // Row Manipulation
  const handleAddRow = () => {
    const defaultAccId = leafAccounts.length > 0 ? leafAccounts[0].id : 0;
    setRows((prev) => [
      ...prev,
      { id: Date.now(), account_id: defaultAccId, cost_center_id: null, debit: 0, credit: 0, description: "" },
    ]);
  };

  const handleRemoveRow = (id: number) => {
    if (rows.length <= 2) {
      alert("يجب أن يحتوي القيد على سطرين على الأقل (طرف مدين وطرف دائن).");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDebitChange = (id: number, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, debit: num, credit: num > 0 ? 0 : r.credit } : r))
    );
  };

  const handleCreditChange = (id: number, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, credit: num, debit: num > 0 ? 0 : r.debit } : r))
    );
  };

  // Submit Handler
  const handleSaveEntry = async (postNow: boolean) => {
    setFormError(null);
    setFormSuccess(null);

    // Validation
    if (!branchId) {
      setFormError("يرجى اختيار الفرع المحاسبي.");
      return;
    }

    if (rows.some((r) => !r.account_id)) {
      setFormError("يرجى التأكد من اختيار الحساب المالي لجميع أسطر القيد.");
      return;
    }

    if (postNow && !isBalanced) {
      setFormError("لا يمكن ترحيل القيد: القيد غير متوازن (المدين لا يساوي الدائن).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date,
        branch_id: branchId,
        description: description.trim() || undefined,
        source_reference: sourceReference.trim() || undefined,
        notes: notes.trim() || undefined,
        post_now: postNow,
        lines: rows.map((r, idx) => ({
          account_id: r.account_id,
          cost_center_id: r.cost_center_id,
          debit: r.debit,
          credit: r.credit,
          description: r.description.trim() || undefined,
          line_order: idx + 1,
        })),
      };

      const result = await accountingApi.createJournalEntry(payload);
      setFormSuccess(
        postNow
          ? `تم اعتماد وترحيل القيد المحاسبي بنجاح برقم [${result.entry_number}].`
          : `تم حفظ مسودة القيد بنجاح برقم [${result.entry_number}].`
      );

      // Reset form
      setDescription("");
      setSourceReference("");
      setNotes("");
      if (leafAccounts.length >= 2) {
        setRows([
          { id: 1, account_id: leafAccounts[0].id, cost_center_id: null, debit: 0, credit: 0, description: "" },
          { id: 2, account_id: leafAccounts[1].id, cost_center_id: null, debit: 0, credit: 0, description: "" },
        ]);
      }
    } catch (err: any) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        const first = Object.values(errRes.errors)[0] as string[];
        setFormError(first[0]);
      } else {
        setFormError(errRes?.message || "تعذر حفظ القيد المحاسبي.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Reversal Execution
  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEntryToReverse || !reversalReason.trim()) return;

    setReversalSubmitting(true);
    try {
      const revResult = await accountingApi.reverseJournalEntry(targetEntryToReverse.id, {
        reason: reversalReason.trim(),
        reversal_date: reversalDate,
      });

      alert(`تم عكس القيد بنجاح وإنشاء القيد العكسي رقم [${revResult.entry_number}]!`);
      setReversalModalOpen(false);
      setTargetEntryToReverse(null);
      setReversalReason("");
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.message || "تعذر إجراء القيد العكسي.");
    } finally {
      setReversalSubmitting(false);
    }
  };

  // Post Draft Entry directly from Log
  const handlePostDraft = async (entry: JournalEntryApi) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في ترحيل واعتماد القيد [${entry.entry_number}]؟`)) {
      return;
    }
    try {
      await accountingApi.postJournalEntry(entry.id);
      alert(`تم ترحيل القيد [${entry.entry_number}] بنجاح.`);
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.message || "تعذر ترحيل القيد.");
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (entry: JournalEntryApi) => {
    if (!window.confirm(`هل أنت متأكد من حذف مسودة القيد [${entry.entry_number}]؟`)) {
      return;
    }
    try {
      await accountingApi.deleteJournalEntry(entry.id);
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.message || "تعذر حذف مسودة القيد.");
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Top Header Bar */}
      <BackBar
        onBack={onBack}
        label="العودة لدليل الحسابات"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ${activeTab === "new" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("new")}
            >
              <Plus size={15} /> قيد يومية جديد
            </button>
            <button
              className={`btn ${activeTab === "log" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("log")}
            >
              <FileText size={15} /> سجل القيود اليومية
            </button>
          </div>
        }
      />

      {activeTab === "new" ? (
        /* ================= NEW ENTRY TAB ================= */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Notifications */}
          {formError && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 6,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
              }}
            >
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 6,
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Entry Header Info Panel */}
          <section className="panel">
            <div className="panel-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <label className="label">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} /> تاريخ القيد *
                  </span>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                <label className="label">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Building size={14} /> الفرع المحاسبي *
                  </span>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(parseInt(e.target.value, 10))}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="label">
                  مرجع السند / الفاتورة (اختياري)
                  <input
                    placeholder="مثال: فاتورة توريد 9823"
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                  />
                </label>

                <label className="label" style={{ gridColumn: "1 / -1" }}>
                  البيان العام للقيد *
                  <input
                    placeholder="بيان موجز يوضح سبب القيد المحاسبي وطبيعة العملية..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Lines Table Panel */}
          <section className="panel">
            <div
              className="panel-head"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <h3 style={{ margin: 0 }}>سطور القيد المحاسبي</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                  الترحيل مسموح فقط على الحسابات التحليلية النشطة (Leaf Accounts)
                </p>
              </div>
              <button className="btn btn-ghost" onClick={handleAddRow}>
                <Plus size={15} /> إضافة سطر
              </button>
            </div>

            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>الحساب التحليلي *</th>
                    <th style={{ width: "20%" }}>مركز التكلفة (اختياري)</th>
                    <th style={{ width: "15%" }}>مدين (Debit)</th>
                    <th style={{ width: "15%" }}>دائن (Credit)</th>
                    <th style={{ width: "10%" }}>البيان</th>
                    <th style={{ width: "5%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td>
                        <select
                          className="inline-input"
                          style={{ width: "100%", padding: "6px 8px" }}
                          value={row.account_id}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, account_id: val } : r))
                            );
                          }}
                        >
                          <option value={0}>-- اختر الحساب المالي --</option>
                          {leafAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name_ar} ({a.nature.label})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <select
                          className="inline-input"
                          style={{ width: "100%", padding: "6px 8px" }}
                          value={row.cost_center_id ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, cost_center_id: val } : r))
                            );
                          }}
                        >
                          <option value="">بدون مركز تكلفة</option>
                          {costCenters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} — {c.name_ar}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={{ textAlign: "end", fontWeight: 700 }}
                          value={row.debit === 0 ? "" : row.debit}
                          placeholder="0.00"
                          onChange={(e) => handleDebitChange(row.id, e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={{ textAlign: "end", fontWeight: 700 }}
                          value={row.credit === 0 ? "" : row.credit}
                          placeholder="0.00"
                          onChange={(e) => handleCreditChange(row.id, e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          placeholder="بيان للسطر..."
                          value={row.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, description: val } : r))
                            );
                          }}
                        />
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                          title="حذف السطر"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Balancing & Summary Foot */}
            <div
              className="panel-foot"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                padding: "16px 20px",
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--panel-subtle, rgba(255,255,255,0.02))",
              }}
            >
              {/* Balance Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isBalanced ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 6,
                      backgroundColor: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#10b981",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>القيد متوازن وجاهز للترحيل</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#ef4444",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <AlertCircle size={18} />
                    <span>
                      غير متوازن (الفرق: {money(difference)})
                    </span>
                  </div>
                )}
              </div>

              {/* Totals & Submit Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 12 }}>إجمالي المدين</span>
                    <strong style={{ color: "#10b981", fontSize: 16, fontFamily: "monospace" }}>
                      {money(totalDebit)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 12 }}>إجمالي الدائن</span>
                    <strong style={{ color: "#3b82f6", fontSize: 16, fontFamily: "monospace" }}>
                      {money(totalCredit)}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleSaveEntry(false)}
                    disabled={submitting}
                  >
                    {submitting ? "جاري الحفظ..." : "حفظ كمسودة"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSaveEntry(true)}
                    disabled={!isBalanced || submitting}
                    style={{ minWidth: 130, justifyContent: "center" }}
                  >
                    {submitting ? "جاري الترحيل..." : "ترحيل القيد"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* ================= ENTRIES LOG TAB ================= */
        <section className="panel">
          <div
            className="panel-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>سجل قيود اليومية المحاسبية</h3>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                القيود المرحّلة محصنة بالكامل ضد التعديل أو الحذف، ويتم إلغاؤها عبر القيود العكسية فقط
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "all", label: "الكل" },
                { id: "posted", label: "مرحّل" },
                { id: "draft", label: "مسودة" },
                { id: "reversed", label: "معكوس" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: statusFilter === pill.id ? 700 : 500,
                    border: statusFilter === pill.id ? "1px solid var(--accent, #2563eb)" : "1px solid var(--border)",
                    backgroundColor: statusFilter === pill.id ? "var(--accent-subtle, rgba(37,99,235,0.1))" : "transparent",
                    color: statusFilter === pill.id ? "var(--accent, #2563eb)" : "inherit",
                    cursor: "pointer",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>رقم القيد</th>
                  <th>التاريخ</th>
                  <th>الفرع</th>
                  <th>البيان</th>
                  <th>المصدر</th>
                  <th>إجمالي المبلغ</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loadingEntries ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 30 }}>
                      جاري تحميل قيود اليومية...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                      لا توجد قيود يومية مسجلة حالياً.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{entry.entry_number}</td>
                      <td>{entry.date}</td>
                      <td>{entry.branch_name || "—"}</td>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.description || "—"}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--border)" }}>
                          {entry.source_type.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {money(entry.total_debit)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontWeight: 600,
                            backgroundColor: entry.status.is_posted
                              ? "rgba(16, 185, 129, 0.12)"
                              : entry.status.is_reversed
                              ? "rgba(239, 68, 68, 0.12)"
                              : "rgba(245, 158, 11, 0.12)",
                            color: entry.status.is_posted
                              ? "#10b981"
                              : entry.status.is_reversed
                              ? "#ef4444"
                              : "#f59e0b",
                            border: `1px solid ${
                              entry.status.is_posted
                                ? "rgba(16, 185, 129, 0.3)"
                                : entry.status.is_reversed
                                ? "rgba(239, 68, 68, 0.3)"
                                : "rgba(245, 158, 11, 0.3)"
                            }`,
                          }}
                        >
                          {entry.status.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setViewEntry(entry)}
                            title="معاينة تفاصيل وسطور القيد"
                            style={{ padding: "4px 8px" }}
                          >
                            <Eye size={14} />
                          </button>

                          {entry.status.is_draft && (
                            <>
                              <button
                                className="btn btn-ghost"
                                onClick={() => handlePostDraft(entry)}
                                title="اعتماد وترحيل القيد"
                                style={{ padding: "4px 8px", color: "#10b981" }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="btn btn-ghost"
                                onClick={() => handleDeleteDraft(entry)}
                                title="حذف المسودة"
                                style={{ padding: "4px 8px", color: "#ef4444" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}

                          {entry.status.is_posted && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => {
                                setTargetEntryToReverse(entry);
                                setReversalReason("");
                                setReversalModalOpen(true);
                              }}
                              title="عكس القيد (إنشاء Reversal Entry مطابق)"
                              style={{ padding: "4px 8px", color: "#f59e0b" }}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= REVERSAL MODAL ================= */}
      {reversalModalOpen && targetEntryToReverse && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="panel" style={{ width: "100%", maxWidth: 500, boxShadow: "0 20px 25px rgba(0,0,0,0.3)" }}>
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>عكس القيد المحاسبي [{targetEntryToReverse.entry_number}]</h3>
              <button onClick={() => setReversalModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteReversal}>
              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    fontSize: 13,
                    color: "#f59e0b",
                    lineHeight: 1.5,
                  }}
                >
                  طبقاً لقواعد النزاهة المحاسبية، لا يمكن تعديل أو حذف القيد المرحّل. سيتم إنشاء قيد عكسي مطابق يعكس كافة الأطراف المدينة والدائنة، وتصبح حالة هذا القيد "معكوس".
                </div>

                <label className="label">
                  تاريخ قيد العكس *
                  <input
                    type="date"
                    required
                    value={reversalDate}
                    onChange={(e) => setReversalDate(e.target.value)}
                  />
                </label>

                <label className="label">
                  سبب إجراء القيد العكسي *
                  <textarea
                    required
                    rows={3}
                    placeholder="مثال: خطأ في إدخال الحساب أو تكرار تسجيل السند..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                  />
                </label>
              </div>

              <div className="panel-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setReversalModalOpen(false)} disabled={reversalSubmitting}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "#f59e0b" }} disabled={reversalSubmitting}>
                  {reversalSubmitting ? "جاري العكس..." : "تنفيذ القيد العكسي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW ENTRY DETAILS MODAL ================= */}
      {viewEntry && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="panel" style={{ width: "100%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 25px rgba(0,0,0,0.3)" }}>
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>تفاصيل القيد المحاسبي [{viewEntry.entry_number}]</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                  التاريخ: {viewEntry.date} | الفرع: {viewEntry.branch_name || "—"} | الحالة: {viewEntry.status.label}
                </p>
              </div>
              <button onClick={() => setViewEntry(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <X size={18} />
              </button>
            </div>

            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {viewEntry.description && (
                <div style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--border)", fontSize: 13 }}>
                  <strong>البيان العام: </strong> {viewEntry.description}
                </div>
              )}

              {/* Lines Table */}
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>الحساب</th>
                      <th>مركز التكلفة</th>
                      <th>مدين</th>
                      <th>دائن</th>
                      <th>بيان السطر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewEntry.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>
                          {l.account_code} — {l.account_name}
                        </td>
                        <td>{l.cost_center_name || "—"}</td>
                        <td style={{ fontFamily: "monospace", color: l.debit > 0 ? "#10b981" : "inherit" }}>
                          {l.debit > 0 ? money(l.debit) : "—"}
                        </td>
                        <td style={{ fontFamily: "monospace", color: l.credit > 0 ? "#3b82f6" : "inherit" }}>
                          {l.credit > 0 ? money(l.credit) : "—"}
                        </td>
                        <td>{l.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, backgroundColor: "var(--border)" }}>
                      <td colSpan={2}>الإجمالي</td>
                      <td style={{ color: "#10b981", fontFamily: "monospace" }}>{money(viewEntry.total_debit)}</td>
                      <td style={{ color: "#3b82f6", fontFamily: "monospace" }}>{money(viewEntry.total_credit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="panel-foot" style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setViewEntry(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
