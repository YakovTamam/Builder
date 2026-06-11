import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import TaskTemplate from "@/models/TaskTemplate";
import TaskForm from "../TaskForm";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    redirect("/tasks");
  }

  const { projectId } = await searchParams;
  if (!projectId) {
    redirect("/tasks");
  }

  await connectToDatabase();
  const project = await Project.findOne({ _id: projectId, companyId: session.companyId }).lean();

  if (!project) {
    notFound();
  }

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    notFound();
  }

  const templates = await TaskTemplate.find({ companyId: session.companyId }).select("name").sort({ name: 1 }).lean();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">משימה חדשה</h1>
        <p className="text-sm text-zinc-400 mt-1">פרויקט: {project.name}</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <TaskForm
          projectId={projectId}
          templates={templates.map((t) => ({ _id: String(t._id), name: t.name }))}
        />
      </div>
    </div>
  );
}
