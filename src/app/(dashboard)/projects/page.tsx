import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { accessibleProjectFilter, MANAGE_ROLES } from "@/lib/access";
import Project from "@/models/Project";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planning: { label: "בתכנון", className: "bg-gray-100 text-gray-800" },
  active: { label: "פעיל", className: "bg-emerald-100 text-emerald-700" },
  on_hold: { label: "מוקפא", className: "bg-amber-100 text-amber-700" },
  completed: { label: "הושלם", className: "bg-blue-100 text-blue-700" },
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  const filter = await accessibleProjectFilter(session);
  const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();
  const canCreate = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">פרויקטים</h1>
        {canCreate && (
          <Link
            href="/projects/new"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium"
          >
            + פרויקט חדש
          </Link>
        )}
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
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
              className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{project.name}</h2>
                  {project.address && <p className="text-sm text-gray-500">{project.address}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>התקדמות</span>
                  <span>{project.progress ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${project.progress ?? 0}%` }}
                  />
                </div>
              </div>

              {project.dueDate && (
                <div className="text-xs text-gray-500">
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
