import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import Document, { DOCUMENT_CATEGORIES } from "@/models/Document";
import type { SessionPayload } from "@/lib/auth";

async function loadAccessibleDocument(id: string, session: SessionPayload) {
  const document = await Document.findById(id);
  if (!document) return null;
  if (String(document.companyId) !== session.companyId) return null;

  if (document.projectId) {
    const project = await getAccessibleProject(String(document.projectId), session);
    if (!project) return null;
  } else if (!["super_admin", "company_admin"].includes(session.role)) {
    // Company-wide documents are only editable by company/super admins.
    return null;
  }

  return document;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();
  const { id } = await params;
  const document = await loadAccessibleDocument(id, session);

  if (!document) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }

  const body = await request.json();
  const {
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
    category?: string;
    title?: string;
    issuer?: string;
    policyNumber?: string;
    coverageAmount?: number | null;
    fileUrl?: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    notes?: string;
  };

  if (category !== undefined) {
    if (!DOCUMENT_CATEGORIES.includes(category as (typeof DOCUMENT_CATEGORIES)[number])) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }
    document.category = category as (typeof DOCUMENT_CATEGORIES)[number];
  }

  if (title !== undefined) document.title = title;
  if (issuer !== undefined) document.issuer = issuer;
  if (policyNumber !== undefined) document.policyNumber = policyNumber;
  if (coverageAmount !== undefined) document.coverageAmount = coverageAmount ?? undefined;
  if (fileUrl !== undefined) document.fileUrl = fileUrl;
  if (issueDate !== undefined) document.issueDate = issueDate ? new Date(issueDate) : undefined;
  if (expiryDate !== undefined) document.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
  if (notes !== undefined) document.notes = notes;

  await document.save();

  return NextResponse.json({ document });
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
  const document = await loadAccessibleDocument(id, session);

  if (!document) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }

  await document.deleteOne();

  return NextResponse.json({ ok: true });
}
