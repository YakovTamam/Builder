"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIORITY_LABELS: Record<string, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

type TemplateItem = {
  title: string;
  description?: string;
  priority: string;
  durationHours?: number;
  workersCount?: number;
  checklist: string[];
};

type Template = {
  _id: string;
  name: string;
  items: TemplateItem[];
};

const EMPTY_ITEM: TemplateItem = { title: "", priority: "medium", checklist: [] };

export default function TemplatesManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateItem(index: number, field: keyof TemplateItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "durationHours" || field === "workersCount") {
          return { ...item, [field]: value ? Number(value) : undefined };
        }
        if (field === "checklist") {
          return { ...item, checklist: value.split("\n").map((s) => s.trim()).filter(Boolean) };
        }
        return { ...item, [field]: value };
      }),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה ביצירת תבנית");
        return;
      }

      setName("");
      setItems([{ ...EMPTY_ITEM }]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/task-templates/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4">
        <h2 className="text-lg font-medium">תבנית חדשה</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-zinc-300">
            שם התבנית
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-sm"
          />
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-zinc-800 p-3 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <input
                  type="text"
                  placeholder="כותרת המשימה"
                  required
                  value={item.title}
                  onChange={(e) => updateItem(index, "title", e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={item.priority}
                  onChange={(e) => updateItem(index, "priority", e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="שעות"
                  value={item.durationHours ?? ""}
                  onChange={(e) => updateItem(index, "durationHours", e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="פועלים"
                  value={item.workersCount ?? ""}
                  onChange={(e) => updateItem(index, "workersCount", e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <textarea
                placeholder="רשימת בדיקה - שורה לכל פריט"
                rows={2}
                value={item.checklist.join("\n")}
                onChange={(e) => updateItem(index, "checklist", e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="self-start text-red-400 hover:text-red-300 text-sm"
                >
                  הסר משימה מהתבנית
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="self-start text-sm text-emerald-400 hover:text-emerald-300">
          + הוסף משימה לתבנית
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="self-start rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "שומר..." : "שמור תבנית"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">תבניות קיימות</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-400">אין עדיין תבניות.</p>
        ) : (
          templates.map((template) => (
            <div key={template._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{template.name}</h3>
                <button
                  onClick={() => handleDelete(template._id)}
                  disabled={deletingId === template._id}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                >
                  מחק
                </button>
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-400">
                {template.items.map((item, index) => (
                  <li key={index}>
                    {item.title} · עדיפות {PRIORITY_LABELS[item.priority] ?? item.priority}
                    {item.checklist.length > 0 ? ` · ${item.checklist.length} פריטי בדיקה` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
