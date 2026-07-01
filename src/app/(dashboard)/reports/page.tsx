import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { MANAGE_ROLES, projectListFilter } from "@/lib/access";
import Project from "@/models/Project";
import Task, { TASK_STATUSES } from "@/models/Task";
import Material, { MATERIAL_STATUSES } from "@/models/Material";
import Alert from "@/models/Alert";

const STATUS_LABELS: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  review: "לבדיקה",
  done: "הושלם",
};

const MATERIAL_STATUS_LABELS: Record<string, string> = {
  ordered: "הוזמן",
  in_transit: "בדרך",
  arrived: "הגיע",
  missing: "חסר",
  issue: "בעיה",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-300",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    redirect("/dashboard");
  }

  await connectToDatabase();

  const projectFilter = projectListFilter(session);
  const projects = await Project.find(projectFilter).sort({ createdAt: -1 }).lean();
  const projectIds = projects.map((p) => p._id);

  const now = new Date();

  const [tasksByStatus, overdueCount, materialsByStatus, unreadAlerts, tasksByProject] = await Promise.all([
    Task.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.countDocuments({ projectId: { $in: projectIds }, dueDate: { $lt: now }, status: { $ne: "done" } }),
    Material.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Alert.countDocuments({
      companyId: session.companyId,
      isRead: false,
      $or: [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }],
    }),
    Task.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: { projectId: "$projectId", status: "$status" }, count: { $sum: 1 } } },
    ]),
  ]);

  const taskStatusCounts: Record<string, number> = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
  for (const row of tasksByStatus) {
    taskStatusCounts[row._id ?? "todo"] = row.count;
  }
  const totalTasks = Object.values(taskStatusCounts).reduce((sum, n) => sum + n, 0);

  const materialStatusCounts: Record<string, number> = Object.fromEntries(MATERIAL_STATUSES.map((s) => [s, 0]));
  for (const row of materialsByStatus) {
    materialStatusCounts[row._id ?? "ordered"] = row.count;
  }
  const totalMaterials = Object.values(materialStatusCounts).reduce((sum, n) => sum + n, 0);

  const projectTaskCounts = new Map<string, Record<string, number>>();
  for (const row of tasksByProject) {
    const key = String(row._id.projectId);
    const counts = projectTaskCounts.get(key) ?? Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
    counts[row._id.status ?? "todo"] = row.count;
    projectTaskCounts.set(key, counts);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">דוחות והתקדמות</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
          <span className="text-sm text-gray-500">פרויקטים</span>
          <span className="text-3xl font-bold">{projects.length}</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
          <span className="text-sm text-gray-500">סה&quot;כ משימות</span>
          <span className="text-3xl font-bold">{totalTasks}</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
          <span className="text-sm text-gray-500">משימות באיחור</span>
          <span className="text-3xl font-bold text-red-600">{overdueCount}</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
          <span className="text-sm text-gray-500">התראות שלא נקראו</span>
          <span className="text-3xl font-bold text-amber-600">{unreadAlerts}</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-3">משימות לפי סטטוס</h2>
        {totalTasks === 0 ? (
          <p className="text-sm text-gray-500">אין משימות עדיין.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white">
              {TASK_STATUSES.map((status) => {
                const pct = (taskStatusCounts[status] / totalTasks) * 100;
                if (pct === 0) return null;
                return <div key={status} className={STATUS_COLORS[status]} style={{ width: `${pct}%` }} />;
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {TASK_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                  <span className="text-gray-500">{STATUS_LABELS[status]}</span>
                  <span className="font-medium">{taskStatusCounts[status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalMaterials > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-medium mb-3">חומרים לפי סטטוס</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
            {MATERIAL_STATUSES.map((status) => (
              <div key={status} className="flex flex-col gap-1 rounded-lg border border-gray-200 p-2">
                <span className="text-gray-500">{MATERIAL_STATUS_LABELS[status]}</span>
                <span className="text-xl font-semibold">{materialStatusCounts[status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-3">התקדמות לפי פרויקט</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">אין פרויקטים עדיין.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((project) => {
              const counts = projectTaskCounts.get(String(project._id)) ?? {};
              const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
              const done = counts.done ?? 0;
              const taskProgress = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Link
                  key={String(project._id)}
                  href={`/projects/${project._id}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-gray-200 p-3 hover:border-gray-400"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-gray-500">
                      {total > 0 ? `${done}/${total} משימות הושלמו (${taskProgress}%)` : "אין משימות"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${taskProgress}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
