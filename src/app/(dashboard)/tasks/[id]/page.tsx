import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { getAccessibleTask, MANAGE_ROLES } from "@/lib/access";
import { tradeLabel, tradeClassName } from "@/lib/trades";
import { formatLocation } from "@/lib/locations";
import Task from "@/models/Task";
import TaskCollaborator from "@/models/TaskCollaborator";
import ActivityLog from "@/models/ActivityLog";
import Material from "@/models/Material";
import TaskStatusSelect from "./TaskStatusSelect";
import DeleteTaskButton from "./DeleteTaskButton";
import TaskComments from "./TaskComments";
import TaskPhotos from "./TaskPhotos";
import TaskAssignSelect from "./TaskAssignSelect";
import TaskCollaborators from "./TaskCollaborators";
import TaskChecklist from "./TaskChecklist";

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  low: { label: "נמוכה", className: "bg-gray-100 text-gray-700" },
  medium: { label: "בינונית", className: "bg-amber-100 text-amber-700" },
  high: { label: "גבוהה", className: "bg-red-100 text-red-700" },
};

const STATUS_LABELS: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  review: "לבדיקה",
  done: "הושלם",
};

const MATERIAL_STATUS_LABELS: Record<string, string> = {
  ordered: "הוזמן",
  in_transit: "בדרך",
  arrived: "הגיע",
  missing: "חסר",
  issue: "בעיה",
};

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

  const result = await getAccessibleTask(id, session);
  if (!result) {
    notFound();
  }

  const { project, permission } = result;
  const task = await Task.findById(id).populate("comments.userId", "name").populate("assignedTo", "name").lean();
  if (!task) {
    notFound();
  }

  const canManage = MANAGE_ROLES.includes(session.role);
  const canComment = permission !== "view";
  const priority = PRIORITY_LABELS[task.priority ?? "medium"] ?? PRIORITY_LABELS.medium;

  const children = task.type === "sequence" ? await Task.find({ parentTaskId: id }).sort({ sequenceOrder: 1 }).lean() : [];
  const parent = task.parentTaskId ? await Task.findById(task.parentTaskId).lean() : null;

  const collaborators = canManage
    ? await TaskCollaborator.find({ taskId: id }).populate("userId", "name email role").sort({ createdAt: -1 }).lean()
    : [];

  const activity = await ActivityLog.find({ entityType: "Task", entityId: id })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const dependencies = task.dependsOn && task.dependsOn.length > 0
    ? await Task.find({ _id: { $in: task.dependsOn } }).select("title status").lean()
    : [];
  const isBlocked = dependencies.some((dep) => dep.status !== "done");

  const linkedMaterials = await Material.find({ taskId: id })
    .select("name status quantity unit expectedDate")
    .sort({ createdAt: -1 })
    .lean();
  const nowMs = new Date().getTime();
  const materialLate = (m: { status?: string; expectedDate?: Date }) =>
    m.status !== "arrived" &&
    (m.status === "missing" || (!!m.expectedDate && new Date(m.expectedDate).getTime() < nowMs));
  const blockingMaterials = linkedMaterials.filter(materialLate);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <Link href={`/tasks?projectId=${project._id}`} className="text-sm text-gray-500 hover:text-emerald-700">
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
        {task.trade && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tradeClassName(task.trade)}`}>
            {tradeLabel(task.trade)}
          </span>
        )}
        {task.type === "sequence" && (
          <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700">
            משימה יוצרת רצף
          </span>
        )}
        {parent && (
          <Link
            href={`/tasks/${parent._id}`}
            className="rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            חלק מרצף: {parent.title}
          </Link>
        )}
      </div>

      {task.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">תיאור</h2>
          <p className="text-sm whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {dependencies.length > 0 && (
        <div className={`rounded-xl border p-4 ${isBlocked ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            {isBlocked ? "⚠️ ממתינה למשימות קודמות" : "משימות קודמות"}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {dependencies.map((dep) => (
              <li key={String(dep._id)}>
                <Link
                  href={`/tasks/${dep._id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:border-gray-400"
                >
                  <span>{dep.title}</span>
                  <span className="text-xs text-gray-500">{STATUS_LABELS[dep.status ?? "todo"]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {linkedMaterials.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            blockingMaterials.length > 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
          }`}
        >
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            {blockingMaterials.length > 0 ? "⚠️ ממתינה לחומרים" : "חומרים למשימה"}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {linkedMaterials.map((m) => (
              <li
                key={String(m._id)}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              >
                <span>
                  {m.name}
                  <span className="text-xs text-gray-500">
                    {" · "}
                    {m.quantity} {m.unit ?? ""}
                  </span>
                </span>
                <span className={`text-xs ${materialLate(m) ? "font-medium text-red-600" : "text-gray-500"}`}>
                  {MATERIAL_STATUS_LABELS[m.status ?? "ordered"] ?? m.status}
                  {materialLate(m) ? " · מאחר" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TaskChecklist
        taskId={String(task._id)}
        checklist={(task.checklist ?? []).map((item: { text: string; done?: boolean }) => ({
          text: item.text,
          done: !!item.done,
        }))}
        canEdit={canComment}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">סטטוס</p>
          {canComment ? (
            <TaskStatusSelect taskId={String(task._id)} status={task.status ?? "todo"} />
          ) : (
            <p className="font-medium">{STATUS_LABELS[task.status ?? "todo"]}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">משך</p>
          <p className="font-medium">{typeof task.durationHours === "number" ? `${task.durationHours} שעות` : "—"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">תאריך יעד</p>
          <p className="font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("he-IL") : "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500 mb-1">עובד שטח אחראי</p>
        {canManage ? (
          <TaskAssignSelect
            taskId={String(task._id)}
            assignedTo={task.assignedTo ? String((task.assignedTo as { _id: string })._id) : undefined}
          />
        ) : (
          <p className="font-medium">
            {task.assignedTo ? (task.assignedTo as { name?: string }).name : "לא משויך"}
          </p>
        )}
      </div>

      {task.stage && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">שלב</p>
          <p className="font-medium">{task.stage}</p>
        </div>
      )}

      {formatLocation(task.location) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">מיקום</p>
          <p className="font-medium">📍 {formatLocation(task.location)}</p>
        </div>
      )}

      {task.type === "sequence" && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-medium mb-3">רצף משימות ההמשך</h2>
          {children.length === 0 ? (
            <p className="text-gray-500 text-sm">לא הוגדרו משימות המשך.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {children.map((child) => (
                <li key={String(child._id)}>
                  <Link
                    href={`/tasks/${child._id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:border-gray-400"
                  >
                    <span>{child.title}</span>
                    <span className="text-xs text-gray-500">
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

      <TaskPhotos taskId={String(task._id)} projectId={String(project._id)} canUpload={canComment} />

      <TaskComments
        taskId={String(task._id)}
        comments={(task.comments ?? []).map((c: { text?: string; createdAt?: Date; userId?: unknown }) => ({
          text: c.text ?? "",
          createdAt: String(c.createdAt),
          userId: c.userId as { name?: string } | undefined,
        }))}
        canComment={canComment}
      />

      {canManage && (
        <TaskCollaborators
          taskId={String(task._id)}
          collaborators={collaborators.map((c) => ({
            _id: String(c._id),
            permission: c.permission ?? "view",
            userId: c.userId as unknown as { _id?: string; name?: string; email?: string; role?: string },
          }))}
        />
      )}

      {activity.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-medium mb-3">היסטוריית פעילות</h2>
          <ul className="flex flex-col gap-2">
            {activity.map((entry) => (
              <li key={String(entry._id)} className="text-sm text-gray-500 flex items-center justify-between">
                <span>
                  {(entry.userId as unknown as { name?: string })?.name ?? "משתמש"} שינה סטטוס מ
                  {STATUS_LABELS[(entry.metadata as { from?: string })?.from ?? ""] ?? "—"} ל
                  {STATUS_LABELS[(entry.metadata as { to?: string })?.to ?? ""] ?? "—"}
                </span>
                <span className="text-xs text-gray-400">{new Date(String(entry.createdAt)).toLocaleString("he-IL")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <Link
            href={`/tasks/${task._id}/edit`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
          >
            עריכת משימה
          </Link>
          <DeleteTaskButton taskId={String(task._id)} projectId={String(project._id)} />
        </div>
      )}
    </div>
  );
}
