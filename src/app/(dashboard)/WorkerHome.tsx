"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WazeButton from "./WazeButton";
import type { WorkerTaskView } from "@/lib/workerTasks";

const PRIORITY: Record<string, { label: string; className: string }> = {
  high: { label: "דחוף", className: "bg-red-100 text-red-700" },
  medium: { label: "רגיל", className: "bg-amber-100 text-amber-700" },
  low: { label: "נמוך", className: "bg-gray-100 text-gray-600" },
};

function dueLabel(dueDate?: string): { text: string; overdue: boolean } | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const overdue = d.getTime() < Date.now();
  return { text: d.toLocaleDateString("he-IL"), overdue };
}

export default function WorkerHome({
  agenda,
}: {
  agenda: { ready: WorkerTaskView[]; blocked: WorkerTaskView[] };
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { ready, blocked } = agenda;
  const next = ready[0];
  const rest = ready.slice(1);

  async function setStatus(taskId: string, status: string) {
    setBusyId(taskId);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "לא ניתן היה לעדכן את המשימה");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (ready.length === 0 && blocked.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-4 py-12 text-center">
        <span className="text-4xl" aria-hidden>
          🎉
        </span>
        <p className="font-medium text-gray-900">אין משימות פתוחות</p>
        <p className="text-sm text-gray-500">כל הכבוד! כשתשובץ למשימה חדשה היא תופיע כאן.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Next task — the hero */}
      {next && (
        <div className="card border-emerald-200 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">המשימה הבאה שלך</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <Link href={`/tasks/${next._id}`} className="text-xl font-semibold text-gray-900 hover:underline">
              {next.title}
            </Link>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${(PRIORITY[next.priority] ?? PRIORITY.medium).className}`}>
              {(PRIORITY[next.priority] ?? PRIORITY.medium).label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            {next.projectName && <span>🏗️ {next.projectName}</span>}
            {next.location && <span>📍 {next.location}</span>}
            {(() => {
              const due = dueLabel(next.dueDate);
              return due ? (
                <span className={due.overdue ? "font-medium text-red-600" : ""}>
                  {due.overdue ? "⏰ באיחור — " : "📅 "}
                  {due.text}
                </span>
              ) : null;
            })()}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {next.status === "todo" && (
              <button
                type="button"
                onClick={() => setStatus(next._id, "in_progress")}
                disabled={busyId === next._id}
                className="btn-primary px-5 py-2.5 text-base"
              >
                ▶ התחל עבודה
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatus(next._id, "done")}
              disabled={busyId === next._id}
              className={
                next.status === "todo"
                  ? "btn-outline px-5 py-2.5 text-base"
                  : "btn-primary px-5 py-2.5 text-base"
              }
            >
              ✓ סיימתי
            </button>
            <WazeButton
              target={{ address: next.address, lat: next.lat, lng: next.lng }}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-600 px-4 py-2.5 text-base font-medium text-sky-700 transition-colors hover:bg-sky-50"
            />
          </div>
        </div>
      )}

      {/* The rest of the ready tasks */}
      {rest.length > 0 && (
        <div className="card">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-sm font-medium text-gray-700">עוד משימות שלך ({rest.length})</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {rest.map((task) => {
              const due = dueLabel(task.dueDate);
              return (
                <li key={task._id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/tasks/${task._id}`} className="text-sm font-medium text-gray-900 hover:underline">
                      {task.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      {task.projectName && <span>{task.projectName}</span>}
                      {task.location && <span>📍 {task.location}</span>}
                      {due && (
                        <span className={due.overdue ? "font-medium text-red-600" : ""}>
                          {due.overdue ? "באיחור" : due.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatus(task._id, "done")}
                    disabled={busyId === task._id}
                    className="btn-outline shrink-0 px-3 py-1.5 text-xs"
                  >
                    ✓ סיימתי
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Blocked — waiting on prerequisites */}
      {blocked.length > 0 && (
        <div className="card">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-sm font-medium text-gray-500">ממתינות ({blocked.length})</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {blocked.map((task) => (
              <li key={task._id} className="px-4 py-3">
                <Link href={`/tasks/${task._id}`} className="text-sm font-medium text-gray-700 hover:underline">
                  {task.title}
                </Link>
                <p className="mt-0.5 text-xs text-amber-700">
                  ⏳ ממתינה ל: {task.blockedBy.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
