import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject } from "@/lib/access";
import Task, { TASK_STATUSES } from "@/models/Task";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];
const MAX_BULK = 200;

// Create many single tasks at once from a list of titles ("paste a list").
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { projectId, titles, status } = body as {
    projectId?: string;
    titles?: unknown;
    status?: string;
  };

  if (!projectId) {
    return NextResponse.json({ error: "חסר projectId" }, { status: 400 });
  }

  const cleanTitles = Array.isArray(titles)
    ? titles
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, MAX_BULK)
    : [];

  if (cleanTitles.length === 0) {
    return NextResponse.json({ error: "לא נמצאו כותרות ליצירה" }, { status: 400 });
  }

  if (status && !TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
    return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  const docs = cleanTitles.map((title) => ({
    projectId,
    title,
    status: status ?? "todo",
    priority: "medium" as const,
    type: "single" as const,
  }));

  const tasks = await Task.insertMany(docs);

  return NextResponse.json({ tasks });
}
