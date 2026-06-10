import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleTask } from "@/lib/access";

export async function POST(
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

  if (result.permission === "view") {
    return NextResponse.json({ error: "אין הרשאה להגיב" }, { status: 403 });
  }

  const body = await request.json();
  const { text } = body as { text?: string };

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "תוכן ההערה חסר" }, { status: 400 });
  }

  const { task } = result;
  task.comments?.push({ userId: session.sub, text: text.trim(), createdAt: new Date() });
  await task.save();

  return NextResponse.json({ comment: { userId: session.sub, name: session.name, text: text.trim(), createdAt: new Date() } });
}
