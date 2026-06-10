import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleTask, MANAGE_ROLES } from "@/lib/access";
import TaskCollaborator from "@/models/TaskCollaborator";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> },
) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();
  const { id, collaboratorId } = await params;
  const result = await getAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  await TaskCollaborator.deleteOne({ _id: collaboratorId, taskId: id });

  return NextResponse.json({ ok: true });
}
