"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { findEquipmentConflicts, type EquipmentBooking } from "@/lib/equipment";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "מתוכנן", className: "bg-gray-100 text-gray-700" },
  { value: "on_site", label: "באתר", className: "bg-emerald-100 text-emerald-700" },
  { value: "returned", label: "הוחזר", className: "bg-blue-100 text-blue-700" },
  { value: "maintenance", label: "בתחזוקה", className: "bg-amber-100 text-amber-700" },
] as const;

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));

type EquipmentItem = {
  _id: string;
  name: string;
  category?: string;
  ownership: string;
  supplier?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  taskId?: string;
  notes?: string;
};

function dateRange(start?: string, end?: string): string {
  const f = (d: string) => new Date(d).toLocaleDateString("he-IL");
  if (start && end) return `${f(start)} – ${f(end)}`;
  if (start) return `מ-${f(start)}`;
  if (end) return `עד ${f(end)}`;
  return "";
}

export default function EquipmentBoard({
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
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [companyBookings, setCompanyBookings] = useState<EquipmentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [ownership, setOwnership] = useState("owned");
  const [supplier, setSupplier] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const projectId = selectedProjectId ?? projects[0]?._id;

  // Ids of bookings that clash with the same machine on another project.
  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of findEquipmentConflicts(companyBookings)) for (const id of c.ids) set.add(id);
    return set;
  }, [companyBookings]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/equipment?projectId=${projectId}`);
      const data = await res.json();
      setEquipment(data.equipment ?? []);
      setCompanyBookings(
        (data.companyEquipment ?? []).map(
          (e: { _id: string; name: string; projectId: string; startDate?: string; endDate?: string }) => ({
            id: e._id,
            name: e.name,
            projectId: String(e.projectId),
            startDate: e.startDate,
            endDate: e.endDate,
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function handleProjectChange(newProjectId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", newProjectId);
    router.push(`/equipment?${params.toString()}`);
  }

  async function handleStatusChange(id: string, status: string) {
    setEquipment((prev) => prev.map((e) => (e._id === id ? { ...e, status } : e)));
    await fetch(`/api/equipment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleDelete(id: string) {
    setEquipment((prev) => prev.filter((e) => e._id !== id));
    setCompanyBookings((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/equipment/${id}`, { method: "DELETE" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
          category: category || undefined,
          ownership,
          supplier: supplier || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהוספת ציוד");
        return;
      }
      setEquipment((prev) => [data.equipment, ...prev]);
      setCompanyBookings((prev) => [
        {
          id: data.equipment._id,
          name: data.equipment.name,
          projectId: String(data.equipment.projectId),
          startDate: data.equipment.startDate,
          endDate: data.equipment.endDate,
        },
        ...prev,
      ]);
      setName("");
      setCategory("");
      setSupplier("");
      setStartDate("");
      setEndDate("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="input sm:max-w-xs"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        {canManage && (
          <button onClick={() => setShowForm((prev) => !prev)} className="btn-primary">
            {showForm ? "ביטול" : "+ ציוד חדש"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">שם המכונה</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="מנוף 25 טון" className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">סוג</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="מנוף / מחפרון..." className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">בעלות</label>
            <select value={ownership} onChange={(e) => setOwnership(e.target.value)} className="input">
              <option value="owned">בבעלות</option>
              <option value="rented">מושכר</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">ספק (להשכרה)</label>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">מתאריך</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">עד תאריך</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2 lg:col-span-3">
            {submitting ? "מוסיף..." : "הוסף ציוד"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">טוען ציוד...</p>
      ) : equipment.length === 0 ? (
        <div className="card p-4 text-sm text-gray-500">אין ציוד רשום לפרויקט זה.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {equipment.map((item) => {
            const statusInfo = STATUS_MAP[item.status] ?? STATUS_OPTIONS[0];
            const range = dateRange(item.startDate, item.endDate);
            const conflict = conflictIds.has(item._id);
            return (
              <div key={item._id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.category && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{item.category}</span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      {item.ownership === "rented" ? "מושכר" : "בבעלות"}
                    </span>
                    {conflict && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        ⚠ מוזמן במקביל לאתר אחר
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    {range && <span>📅 {range}</span>}
                    {item.supplier && <span>ספק: {item.supplier}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item._id, e.target.value)}
                    disabled={!canManage}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70 ${statusInfo.className}`}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {canManage && (
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs transition-colors hover:bg-gray-100"
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
