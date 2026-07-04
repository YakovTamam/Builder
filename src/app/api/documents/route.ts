import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, projectListFilter, MANAGE_ROLES } from "@/lib/access";
import Document, { DOCUMENT_CATEGORIES } from "@/models/Document";
import Project from "@/models/Project";

// A pseudo project id used by the UI to filter to company-wide documents only
// (as opposed to omitting the filter entirely, which returns everything the
// session can see).
const COMPANY_WIDE = "company";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const filter: Record<string, unknown> = { companyId: session.companyId };

  if (projectId === COMPANY_WIDE) {
    filter.projectId = { $exists: false };
  } else if (projectId) {
    const project = await getAccessibleProject(projectId, session);
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }
    filter.$or = [{ projectId }, { projectId: { $exists: false } }];
  } else if (session.role === "project_manager") {
    const projects = await Project.find(projectListFilter(session)).select("_id").lean();
    const projectIds = projects.map((p) => p._id);
    filter.$or = [{ projectId: { $in: projectIds } }, { projectId: { $exists: false } }];
  }

  const documents = await Document.find(filter).sort({ expiryDate: 1, createdAt: -1 }).lean();

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const {
    projectId,
    category,
    title,
    issuer,
    policyNumber,
    coverageAmount,
    fileUrl,
    issueDate,
    expiryDate,
    notes,
  } = body as {
    projectId?: string;
    category?: string;
    title?: string;
    issuer?: string;
    policyNumber?: string;
    coverageAmount?: number;
    fileUrl?: string;
    issueDate?: string;
    expiryDate?: string;
    notes?: string;
  };

  if (!category || !title) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if (!DOCUMENT_CATEGORIES.includes(category as (typeof DOCUMENT_CATEGORIES)[number])) {
    return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
  }

  if (projectId) {
    const project = await getAccessibleProject(projectId, session);
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }
  } else if (!["super_admin", "company_admin"].includes(session.role)) {
    return NextResponse.json({ error: "רק מנהל חברה יכול להוסיף מסמך ברמת החברה" }, { status: 403 });
  }

  const document = await Document.create({
    companyId: session.companyId,
    projectId: projectId || undefined,
    category,
    title,
    issuer: issuer || undefined,
    policyNumber: policyNumber || undefined,
    coverageAmount: typeof coverageAmount === "number" ? coverageAmount : undefined,
    fileUrl: fileUrl || undefined,
    issueDate: issueDate || undefined,
    expiryDate: expiryDate || undefined,
    notes: notes || undefined,
    uploadedBy: session.sub,
  });

  return NextResponse.json({ document });
}
