import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import DeleteProjectButton from "./DeleteProjectButton";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planning: { label: "בתכנון", className: "bg-zinc-700 text-zinc-200" },
  active: { label: "פעיל", className: "bg-emerald-700/30 text-emerald-400" },
  on_hold: { label: "מוקפא", className: "bg-amber-700/30 text-amber-400" },
  completed: { label: "הושלם", className: "bg-blue-700/30 text-blue-400" },
};

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
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

  const status = STATUS_LABELS[project.status ?? "planning"];
  const canManage = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.address && <p className="text-zinc-400 text-sm mt-1">{project.address}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.label ? status.className : ""}`}>
          {status.label}
        </span>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-zinc-400">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">תקציב</p>
          <p className="font-medium">{project.budget ? `₪${project.budget.toLocaleString("he-IL")}` : "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">תאריך התחלה</p>
          <p className="font-medium">
            {project.startDate ? new Date(project.startDate).toLocaleDateString("he-IL") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400 mb-1">תאריך מסירה</p>
          <p className="font-medium">
            {project.dueDate ? new Date(project.dueDate).toLocaleDateString("he-IL") : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-lg font-medium mb-2">משימות</h2>
        <Link
          href={`/tasks?projectId=${project._id}`}
          className="inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 transition-colors"
        >
          ניהול משימות לפרויקט זה
        </Link>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project._id}/edit`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 transition-colors"
          >
            עריכת פרויקט
          </Link>
          <DeleteProjectButton projectId={String(project._id)} />
        </div>
      )}
    </div>
  );
}
