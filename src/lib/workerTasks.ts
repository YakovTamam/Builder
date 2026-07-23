import Project from "@/models/Project";
import Task from "@/models/Task";
import { formatLocation } from "@/lib/locations";

// A single task as shown to the worker — flattened and serializable.
export type WorkerTaskView = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt?: string;
  projectId: string;
  projectName: string;
  address?: string;
  lat?: number;
  lng?: number;
  location?: string;
  blocked: boolean;
  blockedBy: string[];
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

// Orders a worker's tasks by urgency: those with a due date first (earliest —
// so overdue floats to the top), then by priority, then oldest first. Pure so
// it can be unit-tested and reused by the home screen and the daily brief.
export function compareWorkerTasks(
  a: Pick<WorkerTaskView, "dueDate" | "priority" | "createdAt">,
  b: Pick<WorkerTaskView, "dueDate" | "priority" | "createdAt">,
): number {
  const ad = a.dueDate ? new Date(a.dueDate).getTime() : null;
  const bd = b.dueDate ? new Date(b.dueDate).getTime() : null;

  if (ad !== null && bd === null) return -1;
  if (ad === null && bd !== null) return 1;
  if (ad !== null && bd !== null && ad !== bd) return ad - bd;

  const ap = PRIORITY_RANK[a.priority] ?? 1;
  const bp = PRIORITY_RANK[b.priority] ?? 1;
  if (ap !== bp) return ap - bp;

  const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ac - bc;
}

// Load a worker's open tasks, split into "ready" (all prerequisites done) and
// "blocked" (waiting on other tasks), each ordered by urgency. This is the
// shared source of truth for the worker home screen and the morning brief.
export async function loadWorkerAgenda(
  userId: string,
): Promise<{ ready: WorkerTaskView[]; blocked: WorkerTaskView[] }> {
  const tasks = await Task.find({ assignedTo: userId, status: { $ne: "done" } }).lean();
  if (tasks.length === 0) return { ready: [], blocked: [] };

  const projectIds = [...new Set(tasks.map((t) => String(t.projectId)))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select("name address lat lng")
    .lean();
  const projMap = new Map(projects.map((p) => [String(p._id), p]));

  const depIdSet = new Set<string>();
  for (const t of tasks) {
    for (const dep of t.dependsOn ?? []) depIdSet.add(String(dep));
  }
  const depIds = [...depIdSet];
  const deps = depIds.length
    ? await Task.find({ _id: { $in: depIds } }).select("title status").lean()
    : [];
  const depMap = new Map(deps.map((d) => [String(d._id), { title: d.title, status: d.status }]));

  const views: WorkerTaskView[] = tasks.map((t) => {
    const project = projMap.get(String(t.projectId));
    const blockedBy: string[] = [];
    for (const dep of t.dependsOn ?? []) {
      const found = depMap.get(String(dep));
      if (found && found.status !== "done") blockedBy.push(found.title);
    }

    return {
      _id: String(t._id),
      title: t.title,
      status: t.status ?? "todo",
      priority: t.priority ?? "medium",
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
      projectId: String(t.projectId),
      projectName: project?.name ?? "",
      address: project?.address ?? undefined,
      lat: typeof project?.lat === "number" ? project.lat : undefined,
      lng: typeof project?.lng === "number" ? project.lng : undefined,
      location: formatLocation(t.location) || undefined,
      blocked: blockedBy.length > 0,
      blockedBy,
    };
  });

  return {
    ready: views.filter((v) => !v.blocked).sort(compareWorkerTasks),
    blocked: views.filter((v) => v.blocked).sort(compareWorkerTasks),
  };
}
