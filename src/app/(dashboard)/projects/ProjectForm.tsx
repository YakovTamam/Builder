"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyLocations, type ProjectLocations } from "@/lib/locations";

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
  lat?: number | null;
  lng?: number | null;
  status?: string;
  budget?: number;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  progress?: number;
  locations?: ProjectLocations;
};

// Small editor for an ordered list of short labels (add + removable chips).
function ListEditor({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || items.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-700">{label}</label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="text-gray-400 hover:text-red-600"
                aria-label={`הסר ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
        >
          הוסף
        </button>
      </div>
    </div>
  );
}

export default function ProjectForm({ project }: { project?: ProjectFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(project?._id);

  const [name, setName] = useState(project?.name ?? "");
  const [address, setAddress] = useState(project?.address ?? "");
  const [lat, setLat] = useState(
    typeof project?.lat === "number" ? String(project.lat) : "",
  );
  const [lng, setLng] = useState(
    typeof project?.lng === "number" ? String(project.lng) : "",
  );
  const [status, setStatus] = useState(project?.status ?? "planning");
  const [budget, setBudget] = useState(project?.budget?.toString() ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(project?.startDate));
  const [dueDate, setDueDate] = useState(toDateInputValue(project?.dueDate));
  const [progress, setProgress] = useState(project?.progress?.toString() ?? "0");
  const [locations, setLocations] = useState<ProjectLocations>(project?.locations ?? emptyLocations());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      name,
      address,
      lat: lat.trim() ? Number(lat) : null,
      lng: lng.trim() ? Number(lng) : null,
      status,
      budget: budget ? Number(budget) : undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      locations,
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
        <label htmlFor="name" className="text-sm text-gray-700">
          שם הפרויקט
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm text-gray-700">
          כתובת
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-gray-500">משמש לכפתור הניווט ב-Waze.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="lat" className="text-sm text-gray-700">
            קו רוחב (lat) — לא חובה
          </label>
          <input
            id="lat"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="למשל: 32.0853"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="lng" className="text-sm text-gray-700">
            קו אורך (lng) — לא חובה
          </label>
          <input
            id="lng"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="למשל: 34.7818"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <p className="text-xs text-gray-500 sm:col-span-2">
          קואורדינטות מדויקות (אם ידועות) משפרות את הניווט ב-Waze; אחרת הניווט ישתמש בכתובת.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm text-gray-700">
            סטטוס
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="budget" className="text-sm text-gray-700">
            תקציב (₪)
          </label>
          <input
            id="budget"
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="startDate" className="text-sm text-gray-700">
            תאריך התחלה
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm text-gray-700">
            תאריך מסירה
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isEdit && (
        <div className="flex flex-col gap-1">
          <label htmlFor="progress" className="text-sm text-gray-700">
            התקדמות (%)
          </label>
          <input
            id="progress"
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">מיקומים בפרויקט</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            הגדר בניינים, קומות ודירות — ואז אפשר לשייך כל משימה למיקום ולסנן לפיו.
          </p>
        </div>
        <ListEditor
          label="בניינים / מבנים"
          placeholder="למשל: בניין A"
          items={locations.buildings}
          onChange={(buildings) => setLocations((l) => ({ ...l, buildings }))}
        />
        <ListEditor
          label="קומות"
          placeholder="למשל: קומה 3"
          items={locations.floors}
          onChange={(floors) => setLocations((l) => ({ ...l, floors }))}
        />
        <ListEditor
          label="דירות / יחידות"
          placeholder="למשל: דירה 12"
          items={locations.units}
          onChange={(units) => setLocations((l) => ({ ...l, units }))}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "שומר..." : isEdit ? "שמור שינויים" : "צור פרויקט"}
      </button>
    </form>
  );
}
