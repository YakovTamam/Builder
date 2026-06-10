import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskStatusSelect from "./TaskStatusSelect";
import DeleteTaskButton from "./DeleteTaskButton";

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  low: { label: "נמוכה", className: "bg-zinc-700 text-zinc-300" },
  medium: { label: "בינונית", className: "bg-amber-700/30 text-amber-400" },
  high: { label: "גבוהה", className: "bg-red-700/30 text-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  review: "לבדיקה",
  done: "הושלם",
};

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
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

  const canManage = MANAGE_ROLES.includes(session.role);
  const priority = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.medium;

  const children = task.type === "sequence" ? await Task.find({ parentTaskId: id }).sort({ sequenceOrder: 1 }).lean() : [];
  const parent = task.parentTaskId ? await Task.findById(task.parentTaskId).lean() : null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <Link href={`/tasks?projectId=${project._id}`} className="text-sm text-zinc-400 hover:text-white">
          ← חזרה למשימות {project.name}
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold">{task.title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.className}`}>
          עדיפות {priority.label}
        </span>
        {task.type === "sequence" && (
          <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-blue-700/30 text-blue-400">
            משימה יוצרת רצף
          </span>
        )}
        {parent && (
          <Link
            href={`/tasks/${parent._id}`}
            className="rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          >
            חלק מרצף: {parent.title}
          </Link>
        )}
      </div>

      {task.description && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-2">תיאור</h2>
          <p className="text-sm whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">סטטוס</p>
          <TaskStatusSelect taskId={String(task._id)} status={task.status ?? "todo"} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">משך</p>
          <p className="font-medium">{typeof task.durationHours === "number" ? `${task.durationHours} שעות` : "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">כמות פועלים</p>
          <p className="font-medium">{typeof task.workersCount === "number" ? task.workersCount : "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">תאריך יעד</p>
          <p className="font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("he-IL") : "—"}</p>
        </div>
      </div>

      {task.stage && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">שלב</p>
          <p className="font-medium">{task.stage}</p>
        </div>
      )}

      {task.type === "sequence" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-lg font-medium mb-3">רצף משימות ההמשך</h2>
          {children.length === 0 ? (
            <p className="text-zinc-400 text-sm">לא הוגדרו משימות המשך.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {children.map((child) => (
                <li key={String(child._id)}>
                  <Link
                    href={`/tasks/${child._id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:border-zinc-700"
                  >
                    <span>{child.title}</span>
                    <span className="text-xs text-zinc-400">
                      {STATUS_LABELS[child.status ?? "todo"]}
                      {child.dueDate ? ` · ${new Date(child.dueDate).toLocaleDateString("he-IL")}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <Link
            href={`/tasks/${task._id}/edit`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 transition-colors"
          >
            עריכת משימה
          </Link>
          <DeleteTaskButton taskId={String(task._id)} projectId={String(project._id)} />
        </div>
      )}
    </div>
  );
}
