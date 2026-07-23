import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { accessibleProjectFilter, MANAGE_ROLES } from "@/lib/access";
import Project from "@/models/Project";
import EquipmentBoard from "./EquipmentBoard";

export const dynamic = "force-dynamic";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const projects = await Project.find(await accessibleProjectFilter(session))
    .sort({ createdAt: -1 })
    .lean();
  const { projectId } = await searchParams;
  const selectedProjectId = projectId ?? (projects[0] ? String(projects[0]._id) : undefined);
  const canManage = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ציוד ומכונות</h1>

      {projects.length === 0 ? (
        <div className="card p-4 text-sm text-gray-500">
          אין פרויקטים עדיין. יש ליצור פרויקט כדי לנהל ציוד.
        </div>
      ) : (
        <EquipmentBoard
          projects={projects.map((p) => ({ _id: String(p._id), name: p.name }))}
          selectedProjectId={selectedProjectId}
          canManage={canManage}
        />
      )}
    </div>
  );
}
