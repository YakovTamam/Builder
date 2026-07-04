import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import { projectListFilter, MANAGE_ROLES } from "@/lib/access";
import DocumentsManager from "./DocumentsManager";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const projects = await Project.find(projectListFilter(session)).sort({ createdAt: -1 }).lean();
  const { projectId } = await searchParams;
  const canManage = MANAGE_ROLES.includes(session.role);
  const canManageCompanyWide = ["super_admin", "company_admin"].includes(session.role);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">מסמכים וביטוחים</h1>
      <p className="text-sm text-gray-500">
        היתרים, אישורים, ביטוחי עבודות קבלניות וביטוחי אחריות מקצועית - עם התראה לפני שהתוקף פוקע.
      </p>

      <DocumentsManager
        projects={projects.map((p) => ({ _id: String(p._id), name: p.name }))}
        selectedProjectId={projectId}
        canManage={canManage}
        canManageCompanyWide={canManageCompanyWide}
      />
    </div>
  );
}
