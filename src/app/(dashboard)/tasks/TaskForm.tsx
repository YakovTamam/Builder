"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIORITY_OPTIONS = [
  { value: "low", label: "נמוכה" },
  { value: "medium", label: "בינונית" },
  { value: "high", label: "גבוהה" },
];

type SequenceItem = { title: string; durationHours: string; workersCount: string };

export default function TaskForm({
  projectId,
  templates = [],
}: {
  projectId: string;
  templates?: { _id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [stage, setStage] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [workersCount, setWorkersCount] = useState("");
  const [type, setType] = useState<"single" | "sequence">("single");
  const [sequenceItems, setSequenceItems] = useState<SequenceItem[]>([
    { title: "", durationHours: "", workersCount: "" },
  ]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    setChecklistItems((prev) => [...prev, newChecklistItem.trim()]);
    setNewChecklistItem("");
  }

  function removeChecklistItem(index: number) {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tasks/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, templateId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה ביצירת משימות מהתבנית");
        return;
      }

      router.push(`/tasks?projectId=${projectId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function updateSequenceItem(index: number, field: keyof SequenceItem, value: string) {
    setSequenceItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addSequenceItem() {
    setSequenceItems((prev) => [...prev, { title: "", durationHours: "", workersCount: "" }]);
  }

  function removeSequenceItem(index: number) {
    setSequenceItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      projectId,
      title,
      description,
      priority,
      dueDate: dueDate || undefined,
      stage: stage || undefined,
      durationHours: durationHours ? Number(durationHours) : undefined,
      workersCount: workersCount ? Number(workersCount) : undefined,
      type,
      checklist: checklistItems.map((text) => ({ text, done: false })),
    };

    if (type === "sequence") {
      payload.sequenceItems = sequenceItems
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title,
          durationHours: item.durationHours ? Number(item.durationHours) : undefined,
          workersCount: item.workersCount ? Number(item.workersCount) : undefined,
        }));
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה ביצירת המשימה");
        return;
      }

      router.push(`/tasks?projectId=${projectId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {templates.length > 0 && (
        <form onSubmit={handleTemplateSubmit} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3">
          <label htmlFor="templateId" className="text-sm text-zinc-300">
            יצירה מתבנית (אופציונלי)
          </label>
          <div className="flex items-center gap-2">
            <select
              id="templateId"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">בחר תבנית...</option>
              {templates.map((tpl) => (
                <option key={tpl._id} value={tpl._id}>
                  {tpl.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!templateId || loading}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              צור מהתבנית
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-zinc-300">
          כותרת המשימה
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-zinc-300">
          תיאור
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-zinc-300">סוג משימה</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("single")}
            className={`rounded-lg border px-3 py-2 text-sm text-start transition-colors ${
              type === "single" ? "border-emerald-500 bg-emerald-700/20" : "border-zinc-700 bg-zinc-800"
            }`}
          >
            <span className="font-medium">משימה רגילה</span>
            <p className="text-xs text-zinc-400 mt-0.5">משימה עצמאית, ללא המשך אוטומטי.</p>
          </button>
          <button
            type="button"
            onClick={() => setType("sequence")}
            className={`rounded-lg border px-3 py-2 text-sm text-start transition-colors ${
              type === "sequence" ? "border-emerald-500 bg-emerald-700/20" : "border-zinc-700 bg-zinc-800"
            }`}
          >
            <span className="font-medium">משימה יוצרת רצף</span>
            <p className="text-xs text-zinc-400 mt-0.5">בסיום, נוצרות אוטומטית משימות המשך לפי סדר.</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className="text-sm text-zinc-300">
            עדיפות
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="durationHours" className="text-sm text-zinc-300">
            משך (שעות)
          </label>
          <input
            id="durationHours"
            type="number"
            min={0}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="workersCount" className="text-sm text-zinc-300">
            כמות פועלים
          </label>
          <input
            id="workersCount"
            type="number"
            min={0}
            value={workersCount}
            onChange={(e) => setWorkersCount(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm text-zinc-300">
            תאריך יעד
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stage" className="text-sm text-zinc-300">
            שלב
          </label>
          <input
            id="stage"
            type="text"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {type === "sequence" && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">משימות המשך ברצף</h3>
            <button
              type="button"
              onClick={addSequenceItem}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              + הוסף משימה
            </button>
          </div>

          {sequenceItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input
                type="text"
                placeholder={`כותרת משימה ${index + 1}`}
                value={item.title}
                onChange={(e) => updateSequenceItem(index, "title", e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                min={0}
                placeholder="שעות"
                value={item.durationHours}
                onChange={(e) => updateSequenceItem(index, "durationHours", e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                min={0}
                placeholder="פועלים"
                value={item.workersCount}
                onChange={(e) => updateSequenceItem(index, "workersCount", e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {sequenceItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSequenceItem(index)}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
                >
                  הסר
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {type === "single" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-zinc-300">רשימת בדיקה (אופציונלי)</label>
          <div className="flex flex-col gap-1">
            {checklistItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">{item}</span>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(index)}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
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
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={addChecklistItem}
              className="text-xs text-emerald-400 hover:text-emerald-300 px-2"
            >
              + הוסף
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "יוצר..." : "צור משימה"}
      </button>
      </form>
    </div>
  );
}
