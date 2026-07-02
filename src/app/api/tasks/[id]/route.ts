import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleTask, MANAGE_ROLES } from "@/lib/access";
import Task, { TASK_PRIORITIES, TASK_STATUSES } from "@/models/Task";
import TaskCollaborator from "@/models/TaskCollaborator";
import ActivityLog from "@/models/ActivityLog";
import { computeCriticalPath } from "@/lib/criticalPath";
import { sanitizeTaskLocation } from "@/lib/locations";

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
    trade,
    location,
    durationHours,
    assignedTo,
    checklist,
    dependsOn,
    graphPosition,
  } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    stage?: string;
    trade?: string | null;
    location?: unknown;
    durationHours?: number;
    assignedTo?: string | null;
    checklist?: { text: string; done: boolean }[];
    dependsOn?: string[];
    graphPosition?: { x: number; y: number } | null;
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
    if (trade !== undefined) task.trade = trade || undefined;
    if (location !== undefined) task.location = sanitizeTaskLocation(location);
    if (durationHours !== undefined) task.durationHours = durationHours;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined;
    if (dependsOn !== undefined) {
      // Reject a dependency set that would introduce a cycle in the project's
      // task graph. Build the would-be graph (this task's new edges plus every
      // sibling's current edges) and reject if it is no longer acyclic.
      const siblings = await Task.find({ projectId: task.projectId })
        .select("_id dependsOn")
        .lean();
      const graphTasks = siblings.map((t) => ({
        id: String(t._id),
        dependsOn:
          String(t._id) === id
            ? dependsOn
            : (t.dependsOn ?? []).map((d: unknown) => String(d)),
      }));
      if (computeCriticalPath(graphTasks).hasCycle) {
        return NextResponse.json(
          { error: "לא ניתן להוסיף תלות - הדבר ייצור מעגל בין המשימות" },
          { status: 400 },
        );
      }
      task.dependsOn = dependsOn as unknown as typeof task.dependsOn;
    }
    if (graphPosition !== undefined) {
      task.graphPosition =
        graphPosition && typeof graphPosition.x === "number" && typeof graphPosition.y === "number"
          ? { x: graphPosition.x, y: graphPosition.y }
          : undefined;
    }
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
