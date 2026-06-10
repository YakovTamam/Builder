import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import Photo from "@/models/Photo";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;

  const photo = await Photo.findById(id);
  if (!photo) {
    return NextResponse.json({ error: "תמונה לא נמצאה" }, { status: 404 });
  }

  const project = await getAccessibleProject(String(photo.projectId), session);
  if (!project) {
    return NextResponse.json({ error: "תמונה לא נמצאה" }, { status: 404 });
  }

  const isOwner = photo.uploadedBy?.toString() === session.sub;
  if (!isOwner && !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await photo.deleteOne();

  return NextResponse.json({ ok: true });
}
