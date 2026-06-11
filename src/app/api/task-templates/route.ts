import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MANAGE_ROLES } from "@/lib/access";
import TaskTemplate from "@/models/TaskTemplate";
import { TASK_PRIORITIES } from "@/models/Task";

export async function GET() {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const templates = await TaskTemplate.find({ companyId: session.companyId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { name, items } = body as {
    name?: string;
    items?: {
      title?: string;
      description?: string;
      priority?: string;
      durationHours?: number;
      workersCount?: number;
      checklist?: string[];
    }[];
  };

  if (!name || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.title) {
      return NextResponse.json({ error: "לכל פריט נדרשת כותרת" }, { status: 400 });
    }
    if (item.priority && !TASK_PRIORITIES.includes(item.priority as (typeof TASK_PRIORITIES)[number])) {
      return NextResponse.json({ error: "עדיפות לא תקינה" }, { status: 400 });
    }
  }

  const template = await TaskTemplate.create({
    companyId: session.companyId,
    name,
    items: items.map((item) => ({
      title: item.title,
      description: item.description,
      priority: item.priority ?? "medium",
      durationHours: item.durationHours,
      workersCount: item.workersCount,
      checklist: (item.checklist ?? []).filter((c) => c.trim()),
    })),
  });

  return NextResponse.json({ template });
}
