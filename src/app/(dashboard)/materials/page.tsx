import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import { projectListFilter, MANAGE_ROLES } from "@/lib/access";
import MaterialsBoard from "./MaterialsBoard";

export const dynamic = "force-dynamic";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const projects = await Project.find(projectListFilter(session)).sort({ createdAt: -1 }).lean();
  const { projectId } = await searchParams;
  const selectedProjectId = projectId ?? (projects[0] ? String(projects[0]._id) : undefined);
  const canManage = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">לוגיסטיקה וחומרים</h1>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400 text-sm">
          אין פרויקטים עדיין. יש ליצור פרויקט כדי לנהל חומרים.
        </div>
      ) : (
        <MaterialsBoard
          projects={projects.map((p) => ({ _id: String(p._id), name: p.name }))}
          selectedProjectId={selectedProjectId}
          canManage={canManage}
        />
      )}
    </div>
  );
}
