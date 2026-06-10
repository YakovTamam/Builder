"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_COLUMNS = [
  { value: "todo", label: "לביצוע" },
  { value: "in_progress", label: "בתהליך" },
  { value: "review", label: "לבדיקה" },
  { value: "done", label: "הושלם" },
] as const;

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  low: { label: "נמוכה", className: "bg-zinc-700 text-zinc-300" },
  medium: { label: "בינונית", className: "bg-amber-700/30 text-amber-400" },
  high: { label: "גבוהה", className: "bg-red-700/30 text-red-400" },
};

type TaskItem = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  durationHours?: number;
  workersCount?: number;
  dueDate?: string;
  parentTaskId?: string;
};

export default function TaskBoard({
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
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const projectId = selectedProjectId ?? projects[0]?._id;

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

  async function handleStatusChange(taskId: string, status: string) {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        {canManage && (
          <Link
            href={`/tasks/new?projectId=${projectId}`}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium text-center"
          >
            + משימה חדשה
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">טוען משימות...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.value);
            return (
              <div key={column.value} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-sm">{column.label}</h2>
                  <span className="text-xs text-zinc-500">{columnTasks.length}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {columnTasks.map((task) => {
                    const priority = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.medium;
                    return (
                      <div key={task._id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-2">
                        <Link href={`/tasks/${task._id}`} className="font-medium text-sm hover:underline">
                          {task.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 ${priority.className}`}>
                            {priority.label}
                          </span>
                          {task.type === "sequence" && (
                            <span className="rounded-full px-2 py-0.5 bg-blue-700/30 text-blue-400">
                              רצף משימות
                            </span>
                          )}
                          {task.parentTaskId && (
                            <span className="rounded-full px-2 py-0.5 bg-zinc-700 text-zinc-300">
                              חלק מרצף
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                          {typeof task.durationHours === "number" && <span>⏱ {task.durationHours} שעות</span>}
                          {typeof task.workersCount === "number" && <span>👷 {task.workersCount} פועלים</span>}
                          {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString("he-IL")}</span>}
                        </div>

                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

                  {columnTasks.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">אין משימות</p>
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
