"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "ordered", label: "הוזמן", className: "bg-gray-100 text-gray-700" },
  { value: "in_transit", label: "בדרך", className: "bg-blue-100 text-blue-700" },
  { value: "arrived", label: "הגיע", className: "bg-emerald-100 text-emerald-700" },
  { value: "missing", label: "חסר", className: "bg-red-100 text-red-700" },
  { value: "issue", label: "בעיה", className: "bg-amber-100 text-amber-700" },
] as const;

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));

type MaterialItem = {
  _id: string;
  name: string;
  quantity: number;
  unit?: string;
  supplier?: string;
  status: string;
  expectedDate?: string;
  notes?: string;
};

export default function MaterialsBoard({
  projects,
  selectedProjectId,
  canManage,
}: {
  projects: { _id: string; name: string }[];
  selectedProjectId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [supplier, setSupplier] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const projectId = selectedProjectId ?? projects[0]?._id;

  const loadMaterials = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/materials?projectId=${projectId}`);
      const data = await res.json();
      setMaterials(data.materials ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMaterials();
  }, [loadMaterials]);

  function handleProjectChange(newProjectId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", newProjectId);
    router.push(`/materials?${params.toString()}`);
  }

  async function handleStatusChange(id: string, status: string) {
    setMaterials((prev) => prev.map((m) => (m._id === id ? { ...m, status } : m)));
    await fetch(`/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleDelete(id: string) {
    setMaterials((prev) => prev.filter((m) => m._id !== id));
    await fetch(`/api/materials/${id}`, { method: "DELETE" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
          quantity: Number(quantity),
          unit: unit || undefined,
          supplier: supplier || undefined,
          expectedDate: expectedDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהוספת חומר");
        return;
      }
      setMaterials((prev) => [data.material, ...prev]);
      setName("");
      setQuantity("");
      setUnit("");
      setSupplier("");
      setExpectedDate("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
        >
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
            {showForm ? "ביטול" : "+ חומר חדש"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">שם החומר</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">כמות</label>
            <input
              type="number"
              required
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">יחידה</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="טון, יח׳..."
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">ספק</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">תאריך צפוי</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50 sm:col-span-2 lg:col-span-5"
          >
            {submitting ? "מוסיף..." : "הוסף חומר"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">טוען חומרים...</p>
      ) : materials.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
          אין חומרים רשומים לפרויקט זה.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((material) => {
            const statusInfo = STATUS_MAP[material.status] ?? STATUS_OPTIONS[0];
            return (
              <div key={material._id} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{material.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>
                      {material.quantity} {material.unit ?? ""}
                    </span>
                    {material.supplier && <span>ספק: {material.supplier}</span>}
                    {material.expectedDate && (
                      <span>צפוי: {new Date(material.expectedDate).toLocaleDateString("he-IL")}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={material.status}
                    onChange={(e) => handleStatusChange(material._id, e.target.value)}
                    disabled={!canManage}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70 ${statusInfo.className}`}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {canManage && (
                    <button
                      onClick={() => handleDelete(material._id)}
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
