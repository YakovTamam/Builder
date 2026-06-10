import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MANAGE_ROLES } from "@/lib/access";
import Alert from "@/models/Alert";

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

  const alert = await Alert.findOne({ _id: id, companyId: session.companyId });
  if (!alert) {
    return NextResponse.json({ error: "התראה לא נמצאה" }, { status: 404 });
  }

  const body = await request.json();
  const { isRead } = body as { isRead?: boolean };

  if (isRead !== undefined) alert.isRead = isRead;
  await alert.save();

  return NextResponse.json({ alert });
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

  const alert = await Alert.findOne({ _id: id, companyId: session.companyId });
  if (!alert) {
    return NextResponse.json({ error: "התראה לא נמצאה" }, { status: 404 });
  }

  await alert.deleteOne();

  return NextResponse.json({ ok: true });
}
