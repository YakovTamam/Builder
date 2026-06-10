import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Alert from "@/models/Alert";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { projectListFilter } from "@/lib/access";
import AlertsList from "./AlertsList";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const projects = await Project.find(projectListFilter(session)).select("_id name").lean();
  const projectIds = projects.map((p) => p._id);
  const projectNames = new Map(projects.map((p) => [String(p._id), p.name]));

  const filter: Record<string, unknown> = { companyId: session.companyId };
  if (session.role === "project_manager") {
    filter.$or = [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }];
  }

  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).lean();

  const overdueTasks = await Task.find({
    projectId: { $in: projectIds },
    status: { $ne: "done" },
    dueDate: { $lt: new Date() },
  })
    .sort({ dueDate: 1 })
    .lean();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">התראות</h1>

      {overdueTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-400">משימות באיחור</h2>
          {overdueTasks.map((task) => (
            <Link
              key={String(task._id)}
              href={`/tasks/${task._id}`}
              className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 flex items-center justify-between gap-3 hover:border-red-800 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-red-700/30 text-red-400 self-start">
                  גבוהה
                </span>
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-zinc-400">{projectNames.get(String(task.projectId)) ?? ""}</p>
              </div>
              <span className="text-xs text-zinc-400 shrink-0">
                יעד: {new Date(task.dueDate!).toLocaleDateString("he-IL")}
              </span>
            </Link>
          ))}
        </div>
      )}

      <AlertsList
        alerts={alerts.map((a) => ({
          _id: String(a._id),
          type: a.type,
          severity: a.severity ?? "medium",
          title: a.title,
          description: a.description,
          isRead: a.isRead ?? false,
          createdAt: String(a.createdAt),
        }))}
      />
    </div>
  );
}
