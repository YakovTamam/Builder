"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskGraph, { type GraphTask } from "../tasks/TaskGraph";

type ProjectItem = { _id: string; name: string; startDate?: string };

export default function CriticalPathView({
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
  const [tasks, setTasks] = useState<GraphTask[]>([]);
  const [loading, setLoading] = useState(true);

  const projectId = selectedProjectId ?? projects[0]?._id;
  const selectedProject = projects.find((p) => p._id === projectId);

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
    router.push(`/critical-path?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">מפת ענף — נתיב קריטי</h1>
        <p className="text-sm text-gray-500 mt-1">
          כל משימה היא נקודה, והקווים מייצגים תלויות. הנתיב הקריטי מודגש באדום. לחיצה על נקודה פותחת עריכה.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
          אין פרויקטים עדיין. יש ליצור פרויקט לפני הצגת מפת הענף.
        </div>
      ) : (
        <>
          <select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
          >
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="text-gray-500 text-sm">טוען מפה...</p>
          ) : projectId ? (
            <TaskGraph
              projectId={projectId}
              projectStartDate={selectedProject?.startDate}
              tasks={tasks}
              canManage={canManage}
              onReload={loadTasks}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
