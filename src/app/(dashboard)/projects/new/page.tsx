import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ProjectForm from "../ProjectForm";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    redirect("/projects");
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">פרויקט חדש</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <ProjectForm />
      </div>
    </div>
  );
}
