const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planning: { label: "בתכנון", className: "bg-zinc-700 text-zinc-200" },
  active: { label: "פעיל", className: "bg-emerald-700/30 text-emerald-400" },
  on_hold: { label: "מוקפא", className: "bg-amber-700/30 text-amber-400" },
  completed: { label: "הושלם", className: "bg-blue-700/30 text-blue-400" },
};

const MOCK_PROJECTS = [
  {
    id: "1",
    name: "מגדל רוטשילד 22",
    address: "תל אביב",
    status: "active",
    progress: 64,
    dueDate: "15.09.2026",
  },
  {
    id: "2",
    name: "שכונת הגנים - שלב ב'",
    address: "ראשון לציון",
    status: "planning",
    progress: 12,
    dueDate: "01.03.2027",
  },
  {
    id: "3",
    name: "מרכז מסחרי נווה שאנן",
    address: "חיפה",
    status: "on_hold",
    progress: 38,
    dueDate: "20.11.2026",
  },
];

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">פרויקטים</h1>
        <button className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium">
          + פרויקט חדש
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_PROJECTS.map((project) => {
          const status = STATUS_LABELS[project.status];
          return (
            <a
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{project.name}</h2>
                  <p className="text-sm text-zinc-400">{project.address}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>התקדמות</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-zinc-400">תאריך מסירה: {project.dueDate}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
