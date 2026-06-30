import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { projectListFilter } from "@/lib/access";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Material from "@/models/Material";
import User from "@/models/User";

const RESULT_LIMIT = 15;

const STATUS_LABELS: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  review: "לבדיקה",
  done: "הושלם",
  planning: "בתכנון",
  active: "פעיל",
  on_hold: "מוקפא",
  completed: "הושלם",
  ordered: "הוזמן",
  in_transit: "בדרך",
  arrived: "הגיע",
  missing: "חסר",
  issue: "בעיה",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על",
  company_admin: "מנהל חברה",
  project_manager: "מנהל פרויקט",
  field_worker: "עובד שטח",
  consultant: "יועץ",
  client: "לקוח",
};

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let projects: { _id: unknown; name: string; status?: string }[] = [];
  let tasks: { _id: unknown; title: string; status?: string; projectId: unknown }[] = [];
  let materials: { _id: unknown; name: string; status?: string; projectId: unknown }[] = [];
  let users: { _id: unknown; name: string; email: string; role: string }[] = [];

  if (query) {
    await connectToDatabase();
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const projectFilter = projectListFilter(session);
    projects = await Project.find({ ...projectFilter, name: regex }).select("name status").limit(RESULT_LIMIT).lean();

    const scopedProjectIds = (await Project.find(projectFilter).select("_id").lean()).map((p) => p._id);

    tasks = await Task.find({ title: regex, projectId: { $in: scopedProjectIds } })
      .select("title status projectId")
      .limit(RESULT_LIMIT)
      .lean();

    materials = await Material.find({ name: regex, projectId: { $in: scopedProjectIds } })
      .select("name status projectId")
      .limit(RESULT_LIMIT)
      .lean();

    if (session.role !== "project_manager" && ["consultant", "client"].includes(session.role) === false) {
      users = await User.find({ companyId: session.companyId, name: regex })
        .select("name email role")
        .limit(RESULT_LIMIT)
        .lean();
    }
  }

  const hasResults = projects.length || tasks.length || materials.length || users.length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">חיפוש</h1>

      <form className="flex gap-2 max-w-lg">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="חפש פרויקטים, משימות, חומרים, אנשים..."
          autoFocus
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium"
        >
          חיפוש
        </button>
      </form>

      {query && !hasResults && <p className="text-sm text-gray-500">לא נמצאו תוצאות עבור &quot;{query}&quot;.</p>}

      {projects.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">פרויקטים</h2>
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <Link
                key={String(project._id)}
                href={`/projects/${project._id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:border-gray-400"
              >
                <span>{project.name}</span>
                <span className="text-xs text-gray-500">{STATUS_LABELS[project.status ?? ""] ?? project.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">משימות</h2>
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <Link
                key={String(task._id)}
                href={`/tasks/${task._id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:border-gray-400"
              >
                <span>{task.title}</span>
                <span className="text-xs text-gray-500">{STATUS_LABELS[task.status ?? ""] ?? task.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {materials.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">חומרים</h2>
          <div className="flex flex-col gap-2">
            {materials.map((material) => (
              <Link
                key={String(material._id)}
                href={`/materials?projectId=${material.projectId}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:border-gray-400"
              >
                <span>{material.name}</span>
                <span className="text-xs text-gray-500">{STATUS_LABELS[material.status ?? ""] ?? material.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {users.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">אנשים</h2>
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <div
                key={String(user._id)}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p>{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className="text-xs text-gray-500">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
