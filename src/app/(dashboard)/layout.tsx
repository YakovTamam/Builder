import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "./LogoutButton";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על",
  company_admin: "מנהל חברה",
  project_manager: "מנהל פרויקט",
  field_worker: "עובד שטח",
  client: "לקוח",
};

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "בית", icon: "🏠" },
  { href: "/projects", label: "פרויקטים", icon: "🏗️" },
  { href: "/tasks", label: "משימות", icon: "✅" },
  { href: "/photos", label: "תמונות", icon: "📷" },
  { href: "/materials", label: "חומרים", icon: "📦" },
  { href: "/alerts", label: "התראות", icon: "🔔" },
];

const ADMIN_NAV_ITEM = { href: "/users", label: "משתמשים", icon: "👥" };

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.role === "super_admin" || session.role === "company_admin";
  const navItems = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  return (
    <div className="flex flex-1 min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-s border-zinc-800 bg-zinc-900 p-4 flex-col gap-1">
        <div className="text-xl font-bold mb-6 px-2">Builder</div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2">
          <div className="px-2">
            <p className="text-sm font-medium">{session.name}</p>
            <p className="text-xs text-zinc-400">{ROLE_LABELS[session.role] ?? session.role}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10">
        <span className="text-lg font-bold">Builder</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">{session.name}</span>
          <LogoutButton compact />
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-10 grid border-t border-zinc-800 bg-zinc-900"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-zinc-400 hover:text-white text-[11px]"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
