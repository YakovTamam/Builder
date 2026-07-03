import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import TaskTemplate from "@/models/TaskTemplate";
import Task from "@/models/Task";
import User from "@/models/User";
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

  const [templates, workers, siblingTasks] = await Promise.all([
    TaskTemplate.find({ companyId: session.companyId }).select("name").sort({ name: 1 }).lean(),
    User.find({ companyId: session.companyId, role: "field_worker", status: "active" })
      .select("name")
      .sort({ name: 1 })
      .lean(),
    Task.find({ projectId }).select("title").sort({ title: 1 }).lean(),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">משימה חדשה</h1>
        <p className="text-sm text-gray-500 mt-1">פרויקט: {project.name}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <TaskForm
          projectId={projectId}
          templates={templates.map((t) => ({ _id: String(t._id), name: t.name }))}
          workers={workers.map((w) => ({ _id: String(w._id), name: w.name }))}
          siblingTasks={siblingTasks.map((t) => ({ _id: String(t._id), title: t.title }))}
          locations={{
            buildings: (project.locations?.buildings ?? []).map(String),
            floors: (project.locations?.floors ?? []).map(String),
            units: (project.locations?.units ?? []).map(String),
          }}
        />
      </div>
    </div>
  );
}
