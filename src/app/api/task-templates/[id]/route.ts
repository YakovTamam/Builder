import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MANAGE_ROLES } from "@/lib/access";
import TaskTemplate from "@/models/TaskTemplate";

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

  await TaskTemplate.deleteOne({ _id: id, companyId: session.companyId });

  return NextResponse.json({ ok: true });
}
