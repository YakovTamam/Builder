import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { MANAGE_ROLES, accessibleProjectFilter } from "@/lib/access";
import Project from "@/models/Project";
import Task, { TASK_STATUSES } from "@/models/Task";
import Alert from "@/models/Alert";

const STATUS_LABELS: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  review: "לבדיקה",
  done: "הושלם",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-300",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
};

const SEVERITY_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-red-500", label: "גבוהה" },
  medium: { dot: "bg-amber-500", label: "בינונית" },
  low: { dot: "bg-gray-400", label: "נמוכה" },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const projectFilter = await accessibleProjectFilter(session);
  const projects = await Project.find(projectFilter).sort({ createdAt: -1 }).lean();
  const projectIds = projects.map((p) => p._id);
  const canManage = MANAGE_ROLES.includes(session.role);
  const now = new Date();

  const [activeProjects, tasksByStatus, overdueCount, unreadAlerts, recentAlerts, tasksByProject] =
    await Promise.all([
      Project.countDocuments({ ...projectFilter, status: "active" }),
      Task.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Task.countDocuments({ projectId: { $in: projectIds }, dueDate: { $lt: now }, status: { $ne: "done" } }),
      Alert.countDocuments({
        companyId: session.companyId,
        isRead: false,
        $or: [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }],
      }),
      Alert.find({
        companyId: session.companyId,
        $or: [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }],
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      Task.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: { projectId: "$projectId", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

  const statusCounts: Record<string, number> = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
  for (const row of tasksByStatus) statusCounts[row._id ?? "todo"] = row.count;
  const totalTasks = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
  const openTasks = totalTasks - (statusCounts.done ?? 0);

  const projectTaskCounts = new Map<string, Record<string, number>>();
  for (const row of tasksByProject) {
    const key = String(row._id.projectId);
    const counts = projectTaskCounts.get(key) ?? Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
    counts[row._id.status ?? "todo"] = row.count;
    projectTaskCounts.set(key, counts);
  }

  const kpis = [
    { label: "פרויקטים פעילים", value: activeProjects, href: "/projects", tone: "text-gray-900" },
    { label: "משימות פתוחות", value: openTasks, href: "/tasks", tone: "text-gray-900" },
    { label: "משימות באיחור", value: overdueCount, href: "/tasks", tone: "text-red-600" },
    { label: "התראות חדשות", value: unreadAlerts, href: "/alerts", tone: "text-amber-600" },
  ];

  const quickActions = [
    ...(canManage ? [{ href: "/projects/new", label: "פרויקט חדש", icon: "🏗️" }] : []),
    { href: "/tasks", label: "משימות", icon: "✅" },
    { href: "/critical-path", label: "מפת ענף", icon: "🔗" },
    { href: "/photos", label: "תמונות", icon: "📷" },
  ];

  const topProjects = projects.slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">שלום, {session.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">מבט מהיר על הפרויקטים והמשימות שלך</p>
      </div>

      {/* KPIs — 2x2 on mobile, 4-up on desktop, all tappable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1 active:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <span className="text-xs sm:text-sm text-gray-500">{kpi.label}</span>
            <span className={`text-3xl font-bold ${kpi.tone}`}>{kpi.value}</span>
          </Link>
        ))}
      </div>

      {/* Quick actions — big tap targets, horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium active:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <span className="text-lg leading-none">{action.icon}</span>
            {action.label}
          </Link>
        ))}
      </div>

      {/* Task status overview */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">משימות לפי סטטוס</h2>
          <span className="text-sm text-gray-400">{totalTasks} סה״כ</span>
        </div>
        {totalTasks === 0 ? (
          <p className="text-sm text-gray-500">אין משימות עדיין.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
              {TASK_STATUSES.map((status) => {
                const pct = (statusCounts[status] / totalTasks) * 100;
                if (pct === 0) return null;
                return <div key={status} className={STATUS_COLORS[status]} style={{ width: `${pct}%` }} />;
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {TASK_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                  <span className="text-gray-500">{STATUS_LABELS[status]}</span>
                  <span className="font-medium">{statusCounts[status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent alerts */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">התראות אחרונות</h2>
          <Link href="/alerts" className="text-sm text-emerald-600 hover:text-emerald-700">
            הכל
          </Link>
        </div>
        {recentAlerts.length === 0 ? (
          <p className="text-sm text-gray-500">אין התראות להצגה כרגע.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {recentAlerts.map((alert) => {
              const sev = SEVERITY_STYLES[alert.severity ?? "medium"] ?? SEVERITY_STYLES.medium;
              return (
                <li key={String(alert._id)} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${alert.isRead ? "text-gray-500" : "font-medium text-gray-900"}`}>
                      {alert.title}
                    </p>
                    {alert.description && <p className="truncate text-xs text-gray-500">{alert.description}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(String(alert.createdAt)).toLocaleDateString("he-IL")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Per-project progress */}
      {topProjects.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium">התקדמות פרויקטים</h2>
            <Link href="/projects" className="text-sm text-emerald-600 hover:text-emerald-700">
              הכל
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {topProjects.map((project) => {
              const counts = projectTaskCounts.get(String(project._id)) ?? {};
              const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
              const done = counts.done ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link
                  key={String(project._id)}
                  href={`/projects/${project._id}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-gray-200 p-3 active:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{project.name}</span>
                    <span className="shrink-0 text-gray-500">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
