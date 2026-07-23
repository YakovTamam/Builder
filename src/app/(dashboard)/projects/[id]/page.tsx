import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import DeleteProjectButton from "./DeleteProjectButton";
import WazeButton from "../../WazeButton";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planning: { label: "בתכנון", className: "bg-gray-100 text-gray-800" },
  active: { label: "פעיל", className: "bg-emerald-100 text-emerald-700" },
  on_hold: { label: "מוקפא", className: "bg-amber-100 text-amber-700" },
  completed: { label: "הושלם", className: "bg-blue-100 text-blue-700" },
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

  // Field workers may only open a project they have an assigned task in.
  if (session.role === "field_worker") {
    const assigned = await Task.exists({ projectId: project._id, assignedTo: session.sub });
    if (!assigned) notFound();
  }

  const status = STATUS_LABELS[project.status ?? "planning"];
  const canManage = MANAGE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.address && <p className="text-gray-500 text-sm mt-1">{project.address}</p>}
          </div>
          <WazeButton
            target={{
              address: project.address,
              lat: typeof project.lat === "number" ? project.lat : undefined,
              lng: typeof project.lng === "number" ? project.lng : undefined,
            }}
          />
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.label ? status.className : ""}`}>
          {status.label}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">תקציב</p>
          <p className="font-medium">{project.budget ? `₪${project.budget.toLocaleString("he-IL")}` : "—"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">תאריך התחלה</p>
          <p className="font-medium">
            {project.startDate ? new Date(project.startDate).toLocaleDateString("he-IL") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">תאריך מסירה</p>
          <p className="font-medium">
            {project.dueDate ? new Date(project.dueDate).toLocaleDateString("he-IL") : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-2">משימות</h2>
        <Link
          href={`/tasks?projectId=${project._id}`}
          className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
        >
          ניהול משימות לפרויקט זה
        </Link>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project._id}/edit`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
          >
            עריכת פרויקט
          </Link>
          <DeleteProjectButton projectId={String(project._id)} />
        </div>
      )}
    </div>
  );
}
