import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import CriticalPathView from "./CriticalPathView";

export const dynamic = "force-dynamic";

export default async function CriticalPathPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { companyId: session.companyId };
  if (session.role === "project_manager") {
    filter.managerId = session.sub;
  }

  const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();
  const { projectId } = await searchParams;
  const selectedProjectId = projectId ?? (projects[0] ? String(projects[0]._id) : undefined);

  const canManage = ["super_admin", "company_admin", "project_manager"].includes(session.role);

  return (
    <CriticalPathView
      projects={projects.map((p) => ({
        _id: String(p._id),
        name: p.name,
        startDate: p.startDate ? new Date(p.startDate).toISOString() : undefined,
      }))}
      selectedProjectId={selectedProjectId}
      canManage={canManage}
    />
  );
}
