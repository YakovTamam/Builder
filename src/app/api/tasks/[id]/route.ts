import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleTask, MANAGE_ROLES } from "@/lib/access";
import Task, { TASK_PRIORITIES, TASK_STATUSES } from "@/models/Task";
import TaskCollaborator from "@/models/TaskCollaborator";
import ActivityLog from "@/models/ActivityLog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const result = await getAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  const children = await Task.find({ parentTaskId: id }).sort({ sequenceOrder: 1 }).lean();

  return NextResponse.json({ task: result.task, children, permission: result.permission });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const result = await getAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  const { task, permission } = result;
  const isManager = MANAGE_ROLES.includes(session.role);

  const body = await request.json();
  const {
    title,
    description,
    status,
    priority,
    dueDate,
    stage,
    durationHours,
    workersCount,
    assignedTo,
    checklist,
    dependsOn,
  } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    stage?: string;
    durationHours?: number;
    workersCount?: number;
    assignedTo?: string | null;
    checklist?: { text: string; done: boolean }[];
    dependsOn?: string[];
  };

  let previousStatus: string | undefined;
  if (status !== undefined) {
    if (permission === "view") {
      return NextResponse.json({ error: "אין הרשאה לעדכן סטטוס" }, { status: 403 });
    }
    if (!TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    if (status !== "todo" && task.dependsOn && task.dependsOn.length > 0) {
      const blockers = await Task.find({ _id: { $in: task.dependsOn }, status: { $ne: "done" } }).countDocuments();
      if (blockers > 0) {
        return NextResponse.json({ error: "לא ניתן להתקדם - יש משימות קודמות שטרם הושלמו" }, { status: 400 });
      }
    }
    if (task.status !== status) {
      previousStatus = task.status;
      task.status = status as (typeof TASK_STATUSES)[number];
    }
  }

  if (checklist !== undefined) {
    if (permission === "view") {
      return NextResponse.json({ error: "אין הרשאה לעדכן רשימת משימות" }, { status: 403 });
    }
    task.checklist = checklist.map((item) => ({ text: item.text, done: !!item.done }));
  }

  // Only project managers/admins can edit the task definition itself.
  if (isManager) {
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) {
      if (!TASK_PRIORITIES.includes(priority as (typeof TASK_PRIORITIES)[number])) {
        return NextResponse.json({ error: "עדיפות לא תקינה" }, { status: 400 });
      }
      task.priority = priority as (typeof TASK_PRIORITIES)[number];
    }
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (stage !== undefined) task.stage = stage;
    if (durationHours !== undefined) task.durationHours = durationHours;
    if (workersCount !== undefined) task.workersCount = workersCount;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined;
    if (dependsOn !== undefined) task.dependsOn = dependsOn as unknown as typeof task.dependsOn;
  }

  await task.save();

  if (previousStatus) {
    await ActivityLog.create({
      companyId: result.project.companyId,
      projectId: result.project._id,
      userId: session.sub,
      action: "status_changed",
      entityType: "Task",
      entityId: task._id,
      metadata: { from: previousStatus, to: task.status },
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();
  const { id } = await params;
  const result = await getAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  await Task.deleteMany({ $or: [{ _id: id }, { parentTaskId: id }] });
  await TaskCollaborator.deleteMany({ taskId: id });

  return NextResponse.json({ ok: true });
}
