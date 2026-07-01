import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import ProjectForm from "../../ProjectForm";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    redirect("/projects");
  }

  await connectToDatabase();
  const { id } = await params;

  const project = await Project.findOne({ _id: id, companyId: session.companyId }).lean();

  if (!project) {
    notFound();
  }

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">עריכת פרויקט</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <ProjectForm
          project={{
            _id: String(project._id),
            name: project.name,
            address: project.address,
            status: project.status,
            budget: project.budget,
            startDate: project.startDate,
            dueDate: project.dueDate,
            progress: project.progress,
          }}
        />
      </div>
    </div>
  );
}
