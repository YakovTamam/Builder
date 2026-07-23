"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TRADES, tradeLabel, tradeClassName } from "@/lib/trades";
import { formatLocation, type TaskLocation } from "@/lib/locations";
import WazeButton from "../WazeButton";

const STATUS_COLUMNS = [
  { value: "todo", label: "לביצוע" },
  { value: "in_progress", label: "בתהליך" },
  { value: "review", label: "לבדיקה" },
  { value: "done", label: "הושלם" },
] as const;

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  low: { label: "נמוכה", className: "bg-gray-100 text-gray-700" },
  medium: { label: "בינונית", className: "bg-amber-100 text-amber-700" },
  high: { label: "גבוהה", className: "bg-red-100 text-red-700" },
};

type TaskItem = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  durationHours?: number;
  dueDate?: string;
  parentTaskId?: string;
  trade?: string;
  location?: TaskLocation;
};

type ProjectItem = {
  _id: string;
  name: string;
  startDate?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

type BoardView = "board" | "checklist";

export default function TaskBoard({
  projects,
  selectedProjectId,
  canManage,
}: {
  projects: ProjectItem[];
  selectedProjectId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view: BoardView = searchParams.get("view") === "checklist" ? "checklist" : "board";
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [addingColumn, setAddingColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasting, setPasting] = useState(false);

  const projectId = selectedProjectId ?? projects[0]?._id;
  const selectedProject = projects.find((p) => p._id === projectId);

  // Only offer trades that actually appear in this project's tasks.
  const tradesInUse = useMemo(() => {
    const present = new Set(tasks.map((t) => t.trade).filter(Boolean));
    return TRADES.filter((t) => present.has(t.value));
  }, [tasks]);

  // Buildings present on this project's tasks.
  const buildingsInUse = useMemo(() => {
    const present = new Set<string>();
    for (const t of tasks) if (t.location?.building) present.add(t.location.building);
    return [...present].sort();
  }, [tasks]);

  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!tradeFilter || t.trade === tradeFilter) &&
          (!buildingFilter || t.location?.building === buildingFilter),
      ),
    [tasks, tradeFilter, buildingFilter],
  );

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
  }, [loadTasks]);

  function handleProjectChange(newProjectId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", newProjectId);
    router.push(`/tasks?${params.toString()}`);
  }

  function handleViewChange(newView: BoardView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`/tasks?${params.toString()}`);
  }

  async function handleStatusChange(taskId: string, status: string) {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  // Checklist view: ticking an item completes the task; unticking reopens it.
  // Reverts the optimistic change if the server rejects it (e.g. a task can't be
  // completed while it still has unfinished prerequisites).
  async function handleToggleDone(taskId: string, done: boolean) {
    const status = done ? "done" : "todo";
    const previous = tasks.find((t) => t._id === taskId)?.status;
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok && previous) {
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: previous } : t)));
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "לא ניתן היה לעדכן את המשימה");
    }
  }

  // Quick inline create: title only, in the given column's status. Keeps the
  // input open and focused so several tasks can be added in a row.
  async function handleInlineCreate(status: string) {
    const title = newTitle.trim();
    if (!title || !projectId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, status, type: "single" }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => [data.task as TaskItem, ...prev]);
        setNewTitle("");
      }
    } finally {
      setCreating(false);
    }
  }

  const pastedTitles = pasteText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Bulk create: one task per non-empty pasted line, all as "todo".
  async function handlePasteCreate() {
    if (pastedTitles.length === 0 || !projectId) return;
    setPasting(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, titles: pastedTitles, status: "todo" }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.tasks)) {
        setTasks((prev) => [...(data.tasks as TaskItem[]), ...prev]);
        setPasteText("");
        setShowPaste(false);
      }
    } finally {
      setPasting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPaste(true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
            >
              📋 הדבקת רשימה
            </button>
            <Link
              href={`/tasks/new?projectId=${projectId}`}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium text-center"
            >
              + משימה חדשה
            </Link>
          </div>
        )}
      </div>

      {selectedProject && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">מציג משימות עבור</p>
          <h2 className="text-xl font-semibold text-emerald-900">{selectedProject.name}</h2>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* View switch: the existing board vs. a flat checklist */}
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
          <button
            type="button"
            onClick={() => handleViewChange("board")}
            className={`rounded-md px-3 py-1 transition-colors ${
              view === "board" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            🗂️ לוח
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("checklist")}
            className={`rounded-md px-3 py-1 transition-colors ${
              view === "checklist" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {"☑️ צ'ק-ליסט"}
          </button>
        </div>

        {selectedProject && (
          <WazeButton
            target={{
              address: selectedProject.address,
              lat: selectedProject.lat,
              lng: selectedProject.lng,
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-600 text-sky-700 hover:bg-sky-50 px-3 py-1.5 text-sm font-medium transition-colors"
          />
        )}

        <Link
          href={`/critical-path?projectId=${projectId}`}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
        >
          🔗 פתח מפת ענף (נתיב קריטי)
        </Link>

        {tradesInUse.length > 0 && (
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">כל המקצועות</option>
            {tradesInUse.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}

        {buildingsInUse.length > 0 && (
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">כל הבניינים</option>
            {buildingsInUse.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 hover:text-red-700 text-lg leading-none"
            aria-label="סגור"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <BoardSkeleton view={view} />
      ) : view === "checklist" ? (
        <ChecklistView tasks={visibleTasks} onToggle={handleToggleDone} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = visibleTasks.filter((t) => t.status === column.value);
            return (
              <div key={column.value} className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-sm">{column.label}</h2>
                  <span className="text-xs text-gray-400">{columnTasks.length}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {columnTasks.map((task) => {
                    const priority = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.medium;
                    return (
                      <div key={task._id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
                        <Link href={`/tasks/${task._id}`} className="font-medium text-sm hover:underline">
                          {task.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 ${priority.className}`}>
                            {priority.label}
                          </span>
                          {task.type === "sequence" && (
                            <span className="rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
                              רצף משימות
                            </span>
                          )}
                          {task.parentTaskId && (
                            <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-700">
                              חלק מרצף
                            </span>
                          )}
                          {task.trade && (
                            <span className={`rounded-full px-2 py-0.5 ${tradeClassName(task.trade)}`}>
                              {tradeLabel(task.trade)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {typeof task.durationHours === "number" && <span>⏱ {task.durationHours} שעות</span>}
                          {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString("he-IL")}</span>}
                          {formatLocation(task.location) && <span>📍 {formatLocation(task.location)}</span>}
                        </div>

                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {STATUS_COLUMNS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && addingColumn !== column.value && (
                    <p className="text-xs text-gray-400 text-center py-4">אין משימות</p>
                  )}

                  {canManage &&
                    (addingColumn === column.value ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleInlineCreate(column.value);
                            } else if (e.key === "Escape") {
                              setAddingColumn(null);
                              setNewTitle("");
                            }
                          }}
                          placeholder="כותרת המשימה..."
                          disabled={creating}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleInlineCreate(column.value)}
                            disabled={creating || !newTitle.trim()}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-3 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            הוסף
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingColumn(null);
                              setNewTitle("");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            סגור
                          </button>
                          <span className="text-[11px] text-gray-400">Enter להוספה מהירה</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingColumn(column.value);
                          setNewTitle("");
                        }}
                        className="rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-gray-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        ＋ הוסף משימה
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPaste && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPaste(false)}
        >
          <div
            className="flex w-full max-w-md flex-col gap-3 rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">הדבקת רשימת משימות</h3>
              <button
                type="button"
                onClick={() => setShowPaste(false)}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500">כל שורה תיצור משימה נפרדת (בעמודת &quot;לביצוע&quot;).</p>
            <textarea
              autoFocus
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"יציקת יסודות\nזיון עמודים\nטיח פנים\n..."}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{pastedTitles.length} משימות יווצרו</span>
              <button
                type="button"
                onClick={handlePasteCreate}
                disabled={pasting || pastedTitles.length === 0}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {pasting ? "יוצר..." : `צור ${pastedTitles.length} משימות`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lightweight placeholder shown while tasks load, shaped like the view it
// precedes so the layout doesn't jump when real data arrives.
function BoardSkeleton({ view }: { view: BoardView }) {
  if (view === "checklist") {
    return (
      <div className="card divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="skeleton h-4 w-4 rounded" />
            <div className="skeleton h-4 flex-1 max-w-[60%]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map((column) => (
        <div key={column.value} className="card flex flex-col gap-3 p-3">
          <div className="skeleton h-4 w-20" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// A flat, checkable list of the project's tasks. Ticking a row marks the task
// "done"; the same trade/building filters as the board apply (via visibleTasks).
function ChecklistView({
  tasks,
  onToggle,
}: {
  tasks: TaskItem[];
  onToggle: (taskId: string, done: boolean) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="card p-4 text-sm text-gray-500">אין משימות להצגה.</div>
    );
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-sm font-medium text-gray-700">רשימת משימות</h2>
        <span className="text-xs text-gray-400">
          {doneCount}/{tasks.length} הושלמו
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {tasks.map((task) => {
          const done = task.status === "done";
          const location = formatLocation(task.location);
          return (
            <li key={task._id} className="flex items-start gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={done}
                onChange={(e) => onToggle(task._id, e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
                aria-label={`סמן ${task.title} כהושלם`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  href={`/tasks/${task._id}`}
                  className={`text-sm hover:underline ${done ? "text-gray-400 line-through" : "text-gray-900"}`}
                >
                  {task.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  {task.trade && (
                    <span className={`rounded-full px-2 py-0.5 ${tradeClassName(task.trade)}`}>
                      {tradeLabel(task.trade)}
                    </span>
                  )}
                  {location && <span>📍 {location}</span>}
                  {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString("he-IL")}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
