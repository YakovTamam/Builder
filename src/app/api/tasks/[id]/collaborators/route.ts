import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleTask, MANAGE_ROLES } from "@/lib/access";
import { COLLABORATOR_PERMISSIONS } from "@/models/TaskCollaborator";
import TaskCollaborator from "@/models/TaskCollaborator";
import User from "@/models/User";

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

  const collaborators = await TaskCollaborator.find({ taskId: id })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ collaborators });
}

export async function POST(
  request: Request,
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

  const body = await request.json();
  const { email, permission } = body as { email?: string; permission?: string };

  if (!email) {
    return NextResponse.json({ error: "יש להזין אימייל" }, { status: 400 });
  }

  if (!permission || !COLLABORATOR_PERMISSIONS.includes(permission as (typeof COLLABORATOR_PERMISSIONS)[number])) {
    return NextResponse.json({ error: "הרשאה לא תקינה" }, { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase(), companyId: session.companyId });
  if (!user) {
    return NextResponse.json({ error: "לא נמצא משתמש עם אימייל זה בחברה" }, { status: 404 });
  }

  try {
    const collaborator = await TaskCollaborator.create({
      taskId: id,
      userId: user._id,
      permission,
      addedBy: session.sub,
    });
    await collaborator.populate("userId", "name email role");
    return NextResponse.json({ collaborator });
  } catch {
    return NextResponse.json({ error: "המשתמש כבר משויך למשימה זו" }, { status: 409 });
  }
}
