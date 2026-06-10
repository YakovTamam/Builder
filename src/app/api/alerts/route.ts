import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { projectListFilter, MANAGE_ROLES } from "@/lib/access";
import Alert, { ALERT_SEVERITIES, ALERT_TYPES } from "@/models/Alert";
import Project from "@/models/Project";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { companyId: session.companyId };

  if (session.role === "project_manager") {
    const projects = await Project.find(projectListFilter(session)).select("_id").lean();
    const projectIds = projects.map((p) => p._id);
    filter.$or = [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }];
  }

  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ alerts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { projectId, type, severity, title, description } = body as {
    projectId?: string;
    type?: string;
    severity?: string;
    title?: string;
    description?: string;
  };

  if (!type || !title) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if (!ALERT_TYPES.includes(type as (typeof ALERT_TYPES)[number])) {
    return NextResponse.json({ error: "סוג התראה לא תקין" }, { status: 400 });
  }

  if (severity && !ALERT_SEVERITIES.includes(severity as (typeof ALERT_SEVERITIES)[number])) {
    return NextResponse.json({ error: "רמת חומרה לא תקינה" }, { status: 400 });
  }

  if (projectId) {
    const project = await Project.findOne({ _id: projectId, companyId: session.companyId });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }
  }

  const alert = await Alert.create({
    companyId: session.companyId,
    projectId: projectId || undefined,
    type,
    severity: severity ?? "medium",
    title,
    description,
  });

  return NextResponse.json({ alert });
}
