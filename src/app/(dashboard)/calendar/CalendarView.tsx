"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { computeCriticalPath, type CpmTaskInput } from "@/lib/criticalPath";
import { buildMonthGrid, dateKey } from "@/lib/calendar";

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTH_LABELS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const STATUS_LABELS: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  review: "לבדיקה",
  done: "הושלם",
};

// Light chip for a normal-status task; critical/overdue tasks use a bold
// solid-red chip instead (see taskChipClass), matching the graph's visual
// language where "critical" is always solid red.
const TASK_STATUS_CHIP: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

const MATERIAL_STATUS_LABELS: Record<string, string> = {
  ordered: "הוזמן",
  in_transit: "בדרך",
  arrived: "הגיע",
  missing: "חסר",
  issue: "בעיה",
};

const MATERIAL_STATUS_CHIP: Record<string, string> = {
  ordered: "bg-gray-100 text-gray-700",
  in_transit: "bg-blue-100 text-blue-700",
  arrived: "bg-emerald-100 text-emerald-700",
  missing: "bg-red-100 text-red-700",
  issue: "bg-amber-100 text-amber-700",
};

type TaskItem = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  durationHours?: number;
  dependsOn?: string[];
};

type MaterialItem = {
  _id: string;
  name: string;
  status: string;
  expectedDate?: string;
  quantity?: number;
  unit?: string;
};

type CalendarEntry =
  | { kind: "task"; id: string; label: string; className: string; sub: string }
  | { kind: "material"; id: string; label: string; className: string; sub: string };

function isMaterialLate(m: MaterialItem, nowMs: number) {
  if (m.status === "arrived") return false;
  if (m.status === "missing") return true;
  if (!m.expectedDate) return false;
  return new Date(m.expectedDate).getTime() < nowMs;
}

export default function CalendarView({
  projects,
  selectedProjectId,
}: {
  projects: { _id: string; name: string }[];
  selectedProjectId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const projectId = selectedProjectId ?? projects[0]?._id;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [taskRes, materialRes] = await Promise.all([
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch(`/api/materials?projectId=${projectId}`),
      ]);
      const taskData = await taskRes.json();
      const materialData = await materialRes.json();
      setTasks(taskData.tasks ?? []);
      setMaterials(materialData.materials ?? []);
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
    router.push(`/calendar?${params.toString()}`);
  }

  // A task is critical if it sits on the project's critical path (computed
  // the same way as the graph); combined with "overdue" for the calendar's
  // red/status coloring rule.
  const criticalTaskIds = useMemo(() => {
    const inputs: CpmTaskInput[] = tasks.map((t) => ({
      id: t._id,
      durationHours: t.durationHours,
      dependsOn: t.dependsOn ?? [],
    }));
    return new Set(computeCriticalPath(inputs).criticalTaskIds);
  }, [tasks]);

  function isTaskOverdue(t: TaskItem, nowMs: number) {
    return t.status !== "done" && !!t.dueDate && new Date(t.dueDate).getTime() < nowMs;
  }

  const entriesByDay = useMemo(() => {
    const nowMs = today.getTime();
    const map = new Map<string, CalendarEntry[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = dateKey(new Date(t.dueDate));
      const urgent = criticalTaskIds.has(t._id) || isTaskOverdue(t, nowMs);
      const entry: CalendarEntry = {
        kind: "task",
        id: t._id,
        label: t.title,
        className: urgent ? "bg-red-600 text-white" : TASK_STATUS_CHIP[t.status] ?? TASK_STATUS_CHIP.todo,
        sub: urgent ? (criticalTaskIds.has(t._id) ? "קריטי" : "באיחור") : STATUS_LABELS[t.status] ?? t.status,
      };
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    for (const m of materials) {
      if (!m.expectedDate) continue;
      const key = dateKey(new Date(m.expectedDate));
      const late = isMaterialLate(m, nowMs);
      const entry: CalendarEntry = {
        kind: "material",
        id: m._id,
        label: m.name,
        className: late ? "bg-red-600 text-white" : MATERIAL_STATUS_CHIP[m.status] ?? MATERIAL_STATUS_CHIP.ordered,
        sub: late ? "מאחר" : MATERIAL_STATUS_LABELS[m.status] ?? m.status,
      };
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [tasks, materials, criticalTaskIds, today]);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const todayKey = dateKey(today);

  function goToMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function EntryChip({ entry }: { entry: CalendarEntry }) {
    const href = entry.kind === "task" ? `/tasks/${entry.id}` : `/materials?projectId=${projectId}`;
    return (
      <Link
        href={href}
        className={`block truncate rounded px-1.5 py-0.5 text-[10px] leading-tight ${entry.className}`}
        title={`${entry.kind === "task" ? "✅" : "📦"} ${entry.label} · ${entry.sub}`}
      >
        {entry.kind === "task" ? "✅" : "📦"} {entry.label}
      </Link>
    );
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            ‹ הקודם
          </button>
          <span className="min-w-32 text-center text-sm font-medium">
            {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            הבא ›
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            היום
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> קריטי / באיחור
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> לפי סטטוס
        </span>
        <span>✅ משימה · 📦 חומר</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">טוען יומן...</p>
      ) : (
        <>
          {/* Desktop: month grid */}
          <div className="hidden md:grid grid-cols-7 gap-1.5 rounded-xl border border-gray-200 bg-white p-3">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-1 text-center text-xs font-medium text-gray-500">
                {label}
              </div>
            ))}
            {grid.map(({ date, inMonth }) => {
              const key = dateKey(date);
              const entries = entriesByDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`flex min-h-24 flex-col gap-0.5 rounded-lg border p-1.5 ${
                    inMonth ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <span
                    className={`self-start rounded-full px-1.5 text-xs ${
                      isToday ? "bg-emerald-600 text-white font-semibold" : inMonth ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {entries.slice(0, 3).map((entry) => (
                      <EntryChip key={`${entry.kind}-${entry.id}`} entry={entry} />
                    ))}
                    {entries.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{entries.length - 3} עוד</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: agenda list */}
          <div className="flex flex-col gap-2 md:hidden">
            {grid
              .filter(({ inMonth }) => inMonth)
              .map(({ date }) => {
                const key = dateKey(date);
                const entries = entriesByDay.get(key) ?? [];
                if (entries.length === 0) return null;
                const isToday = key === todayKey;
                return (
                  <div key={key} className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className={`mb-1.5 text-xs font-medium ${isToday ? "text-emerald-600" : "text-gray-500"}`}>
                      {date.getDate()} ב{MONTH_LABELS[date.getMonth()]} {isToday && "· היום"}
                    </p>
                    <div className="flex flex-col gap-1">
                      {entries.map((entry) => (
                        <EntryChip key={`${entry.kind}-${entry.id}`} entry={entry} />
                      ))}
                    </div>
                  </div>
                );
              })}
            {grid.filter(({ inMonth }) => inMonth).every(({ date }) => (entriesByDay.get(dateKey(date)) ?? []).length === 0) && (
              <p className="text-sm text-gray-500 text-center py-6">אין משימות או חומרים בחודש זה.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
