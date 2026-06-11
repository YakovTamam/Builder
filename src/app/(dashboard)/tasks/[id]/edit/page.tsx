import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskEditForm from "../../TaskEditForm";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    redirect("/tasks");
  }

  await connectToDatabase();
  const { id } = await params;

  const task = await Task.findById(id).lean();
  if (!task) {
    notFound();
  }

  const project = await Project.findOne({ _id: task.projectId, companyId: session.companyId }).lean();
  if (!project) {
    notFound();
  }

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    notFound();
  }

  const siblingTasks = await Task.find({
    projectId: task.projectId,
    _id: { $ne: task._id },
  })
    .select("title")
    .sort({ title: 1 })
    .lean();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">עריכת משימה</h1>
        <p className="text-sm text-zinc-400 mt-1">פרויקט: {project.name}</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <TaskEditForm
          task={{
            _id: String(task._id),
            title: task.title,
            description: task.description,
            priority: task.priority ?? "medium",
            dueDate: task.dueDate,
            stage: task.stage,
            durationHours: task.durationHours,
            workersCount: task.workersCount,
            dependsOn: (task.dependsOn ?? []).map((depId: unknown) => String(depId)),
            checklist: (task.checklist ?? []).map((item: { text: string; done?: boolean }) => ({
              text: item.text,
              done: !!item.done,
            })),
          }}
          siblingTasks={siblingTasks.map((t) => ({ _id: String(t._id), title: t.title }))}
        />
      </div>
    </div>
  );
}
