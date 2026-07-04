"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getExpiryStatus, daysUntilExpiry } from "@/lib/documents";

const COMPANY_WIDE = "company";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const CATEGORY_OPTIONS = [
  { value: "permit", label: "היתר" },
  { value: "insurance", label: "ביטוח" },
  { value: "certificate", label: "אישור/תעודה" },
  { value: "contract", label: "חוזה" },
  { value: "other", label: "אחר" },
] as const;

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  expired: { label: "פג תוקף", className: "bg-red-100 text-red-700" },
  expiring_soon: { label: "עומד לפוג", className: "bg-amber-100 text-amber-700" },
  valid: { label: "בתוקף", className: "bg-emerald-100 text-emerald-700" },
  no_expiry: { label: "ללא תפוגה", className: "bg-gray-100 text-gray-600" },
};

type DocumentItem = {
  _id: string;
  projectId?: string;
  category: string;
  title: string;
  issuer?: string;
  policyNumber?: string;
  coverageAmount?: number;
  fileUrl?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
};

export default function DocumentsManager({
  projects,
  selectedProjectId,
  canManage,
  canManageCompanyWide,
}: {
  projects: { _id: string; name: string }[];
  selectedProjectId?: string;
  canManage: boolean;
  canManageCompanyWide: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formProjectId, setFormProjectId] = useState(
    selectedProjectId && selectedProjectId !== COMPANY_WIDE ? selectedProjectId : "",
  );
  const [category, setCategory] = useState<string>("permit");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const filterValue = selectedProjectId ?? "";

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const query = filterValue ? `?projectId=${filterValue}` : "";
      const res = await fetch(`/api/documents${query}`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterValue]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("projectId", value);
    else params.delete("projectId");
    router.push(`/documents?${params.toString()}`);
  }

  function projectName(id?: string) {
    if (!id) return "כלל החברה";
    return projects.find((p) => p._id === id)?.name ?? "פרויקט";
  }

  function resetForm() {
    setCategory("permit");
    setTitle("");
    setIssuer("");
    setPolicyNumber("");
    setCoverageAmount("");
    setFileUrl("");
    setIssueDate("");
    setExpiryDate("");
    setNotes("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("יש לבחור קובץ תמונה או PDF בלבד");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("הקובץ גדול מדי (מקסימום 8MB)");
      return;
    }

    setError(null);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setFileUrl(reader.result);
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: formProjectId || undefined,
          category,
          title,
          issuer: issuer || undefined,
          policyNumber: policyNumber || undefined,
          coverageAmount: coverageAmount ? Number(coverageAmount) : undefined,
          fileUrl: fileUrl || undefined,
          issueDate: issueDate || undefined,
          expiryDate: expiryDate || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהוספת מסמך");
        return;
      }
      setDocuments((prev) =>
        [data.document, ...prev].sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }),
      );
      resetForm();
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDocuments((prev) => prev.filter((d) => d._id !== id));
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  }

  const now = useMemo(() => new Date(), []).getTime();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <select
          value={filterValue}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
        >
          <option value="">כל המסמכים הזמינים</option>
          <option value={COMPANY_WIDE}>כלל החברה בלבד</option>
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        {canManage && (
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium text-center"
          >
            {showForm ? "ביטול" : "+ מסמך חדש"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">שייך ל</label>
            <select
              value={formProjectId}
              onChange={(e) => setFormProjectId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {canManageCompanyWide && <option value="">כלל החברה</option>}
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">קטגוריה</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">כותרת</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: ביטוח עבודות קבלניות 2026"
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">מנפיק / חברת ביטוח</label>
            <input
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">מספר פוליסה / היתר</label>
            <input
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">סכום כיסוי (₪)</label>
            <input
              type="number"
              min={0}
              value={coverageAmount}
              onChange={(e) => setCoverageAmount(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">תאריך הנפקה</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">תאריך תפוגה</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">קובץ סרוק (תמונה/PDF)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="text-sm text-gray-700 file:me-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm"
            />
            {uploading && <span className="text-xs text-gray-500">מעלה קובץ...</span>}
            {fileUrl && !uploading && <span className="text-xs text-emerald-700">✓ קובץ מצורף</span>}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <label className="text-sm text-gray-700">הערות</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50 sm:col-span-2 lg:col-span-3"
          >
            {submitting ? "שומר..." : "הוסף מסמך"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">טוען מסמכים...</p>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
          אין מסמכים רשומים.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const status = getExpiryStatus(doc.expiryDate, now);
            const statusInfo = STATUS_STYLES[status];
            return (
              <div key={doc._id} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{doc.title}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      {CATEGORY_LABELS[doc.category] ?? doc.category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{projectName(doc.projectId)}</span>
                    {doc.issuer && <span>מנפיק: {doc.issuer}</span>}
                    {doc.policyNumber && <span>מס׳: {doc.policyNumber}</span>}
                    {typeof doc.coverageAmount === "number" && (
                      <span>כיסוי: ₪{doc.coverageAmount.toLocaleString("he-IL")}</span>
                    )}
                    {doc.expiryDate && (
                      <span>
                        תוקף: {new Date(doc.expiryDate).toLocaleDateString("he-IL")}
                        {status === "expiring_soon" && ` (עוד ${daysUntilExpiry(doc.expiryDate, now)} ימים)`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 transition-colors"
                    >
                      צפייה בקובץ
                    </a>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 transition-colors"
                    >
                      מחק
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
