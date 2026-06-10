import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planning: { label: "בתכנון", className: "bg-zinc-700 text-zinc-200" },
  active: { label: "פעיל", className: "bg-emerald-700/30 text-emerald-400" },
  on_hold: { label: "מוקפא", className: "bg-amber-700/30 text-amber-400" },
  completed: { label: "הושלם", className: "bg-blue-700/30 text-blue-400" },
};

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { companyId: session.companyId };
  if (session.role === "project_manager") {
    filter.managerId = session.sub;
  }

  const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();
  const canCreate = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">פרויקטים</h1>
        {canCreate && (
          <Link
            href="/projects/new"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium"
          >
            + פרויקט חדש
          </Link>
        )}
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400 text-sm">
          אין פרויקטים עדיין.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const status = STATUS_LABELS[project.status ?? "planning"];
          return (
            <Link
              key={String(project._id)}
              href={`/projects/${project._id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{project.name}</h2>
                  {project.address && <p className="text-sm text-zinc-400">{project.address}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>התקדמות</span>
                  <span>{project.progress ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${project.progress ?? 0}%` }}
                  />
                </div>
              </div>

              {project.dueDate && (
                <div className="text-xs text-zinc-400">
                  תאריך מסירה: {new Date(project.dueDate).toLocaleDateString("he-IL")}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
