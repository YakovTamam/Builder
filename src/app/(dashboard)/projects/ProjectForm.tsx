"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "planning", label: "בתכנון" },
  { value: "active", label: "פעיל" },
  { value: "on_hold", label: "מוקפא" },
  { value: "completed", label: "הושלם" },
];

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type ProjectFormValues = {
  _id?: string;
  name?: string;
  address?: string;
  status?: string;
  budget?: number;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  progress?: number;
};

export default function ProjectForm({ project }: { project?: ProjectFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(project?._id);

  const [name, setName] = useState(project?.name ?? "");
  const [address, setAddress] = useState(project?.address ?? "");
  const [status, setStatus] = useState(project?.status ?? "planning");
  const [budget, setBudget] = useState(project?.budget?.toString() ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(project?.startDate));
  const [dueDate, setDueDate] = useState(toDateInputValue(project?.dueDate));
  const [progress, setProgress] = useState(project?.progress?.toString() ?? "0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      name,
      address,
      status,
      budget: budget ? Number(budget) : undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    };

    if (isEdit) {
      payload.progress = Number(progress);
    }

    try {
      const res = await fetch(isEdit ? `/api/projects/${project!._id}` : "/api/projects", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בשמירת הפרויקט");
        return;
      }

      const id = isEdit ? project!._id : data.project._id;
      router.push(`/projects/${id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-zinc-300">
          שם הפרויקט
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm text-zinc-300">
          כתובת
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm text-zinc-300">
            סטטוס
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="budget" className="text-sm text-zinc-300">
            תקציב (₪)
          </label>
          <input
            id="budget"
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="startDate" className="text-sm text-zinc-300">
            תאריך התחלה
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm text-zinc-300">
            תאריך מסירה
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isEdit && (
        <div className="flex flex-col gap-1">
          <label htmlFor="progress" className="text-sm text-zinc-300">
            התקדמות (%)
          </label>
          <input
            id="progress"
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "שומר..." : isEdit ? "שמור שינויים" : "צור פרויקט"}
      </button>
    </form>
  );
}
