import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Alert from "@/models/Alert";
import Project from "@/models/Project";
import { projectListFilter, MANAGE_ROLES } from "@/lib/access";
import AlertsList from "./AlertsList";
import RefreshAlertsButton from "./RefreshAlertsButton";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { companyId: session.companyId };
  if (session.role === "project_manager") {
    const projects = await Project.find(projectListFilter(session)).select("_id").lean();
    const projectIds = projects.map((p) => p._id);
    filter.$or = [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }];
  }

  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).lean();
  const canManage = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">התראות</h1>
        {canManage && <RefreshAlertsButton />}
      </div>

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
