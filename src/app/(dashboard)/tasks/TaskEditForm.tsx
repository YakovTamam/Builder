"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRADES } from "@/lib/trades";
import { stageOptions } from "@/lib/stages";
import { emptyLocations, type ProjectLocations, type TaskLocation } from "@/lib/locations";
import LocationFields, { type TaskLocationValue } from "./LocationFields";

const PRIORITY_OPTIONS = [
  { value: "low", label: "נמוכה" },
  { value: "medium", label: "בינונית" },
  { value: "high", label: "גבוהה" },
];

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type ChecklistItem = { text: string; done: boolean };

type TaskValues = {
  _id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string | Date | null;
  stage?: string;
  trade?: string;
  location?: TaskLocation;
  durationHours?: number;
  dependsOn?: string[];
  checklist?: ChecklistItem[];
};

export default function TaskEditForm({
  task,
  siblingTasks = [],
  locations = emptyLocations(),
}: {
  task: TaskValues;
  siblingTasks?: { _id: string; title: string }[];
  locations?: ProjectLocations;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [stage, setStage] = useState(task.stage ?? "");
  const [trade, setTrade] = useState(task.trade ?? "");
  const [location, setLocation] = useState<TaskLocationValue>({
    building: task.location?.building ?? "",
    floor: task.location?.floor ?? "",
    unit: task.location?.unit ?? "",
  });
  const [durationHours, setDurationHours] = useState(task.durationHours?.toString() ?? "");
  const [dependsOn, setDependsOn] = useState<string[]>(task.dependsOn ?? []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist ?? []);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDependency(id: string) {
    setDependsOn((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    setChecklist((prev) => [...prev, { text: newChecklistItem.trim(), done: false }]);
    setNewChecklistItem("");
  }

  function removeChecklistItem(index: number) {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate || undefined,
          stage: stage || undefined,
          trade: trade || null,
          location,
          durationHours: durationHours ? Number(durationHours) : undefined,
          dependsOn,
          checklist,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בשמירת המשימה");
        return;
      }

      router.push(`/tasks/${task._id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-gray-700">
          כותרת המשימה
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-gray-700">
          תיאור
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className="text-sm text-gray-700">
            עדיפות
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="durationHours" className="text-sm text-gray-700">
            משך (שעות)
          </label>
          <input
            id="durationHours"
            type="number"
            min={0}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm text-gray-700">
            תאריך יעד
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stage" className="text-sm text-gray-700">
            שלב
          </label>
          <select
            id="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">ללא</option>
            {stageOptions(task.stage).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="trade" className="text-sm text-gray-700">
            מקצוע
          </label>
          <select
            id="trade"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">ללא</option>
            {TRADES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LocationFields options={locations} value={location} onChange={setLocation} />

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-700">משימות חוסמות (תלות)</label>
        {siblingTasks.length === 0 ? (
          <p className="text-xs text-gray-400">אין משימות אחרות בפרויקט</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-lg border border-gray-300 p-2">
            {siblingTasks.map((sibling) => (
              <label key={sibling._id} className="flex items-center gap-2 text-sm px-1 py-1">
                <input
                  type="checkbox"
                  checked={dependsOn.includes(sibling._id)}
                  onChange={() => toggleDependency(sibling._id)}
                  className="accent-emerald-600"
                />
                {sibling.title}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-700">רשימת בדיקה</label>
        <div className="flex flex-col gap-1">
          {checklist.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2">{item.text}</span>
              <button
                type="button"
                onClick={() => removeChecklistItem(index)}
                className="text-red-600 hover:text-red-700 text-sm px-2"
              >
                הסר
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newChecklistItem}
            onChange={(e) => setNewChecklistItem(e.target.value)}
            placeholder="פריט חדש"
            className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={addChecklistItem}
            className="text-xs text-emerald-600 hover:text-emerald-700 px-2"
          >
            + הוסף
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "שומר..." : "שמור שינויים"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/tasks/${task._id}`)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
