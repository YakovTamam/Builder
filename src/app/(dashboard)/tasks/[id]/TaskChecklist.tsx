"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChecklistItem = { text: string; done: boolean };

export default function TaskChecklist({
  taskId,
  checklist,
  canEdit,
}: {
  taskId: string;
  checklist: ChecklistItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(checklist);
  const [loading, setLoading] = useState(false);

  async function toggle(index: number) {
    if (!canEdit || loading) return;
    const next = items.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
    setItems(next);
    setLoading(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  const doneCount = items.filter((item) => item.done).length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-sm font-medium text-zinc-400 mb-2">
        רשימת בדיקה ({doneCount}/{items.length})
      </h2>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index}>
            <label className={`flex items-center gap-2 text-sm ${canEdit ? "cursor-pointer" : ""}`}>
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canEdit || loading}
                onChange={() => toggle(index)}
                className="accent-emerald-600"
              />
              <span className={item.done ? "line-through text-zinc-500" : ""}>{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
