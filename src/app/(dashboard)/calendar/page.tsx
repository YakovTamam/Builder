import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import CalendarView from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">יומן</h1>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
          אין פרויקטים עדיין.
        </div>
      ) : (
        <CalendarView
          projects={projects.map((p) => ({ _id: String(p._id), name: p.name }))}
          selectedProjectId={selectedProjectId}
        />
      )}
    </div>
  );
}
