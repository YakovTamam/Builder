import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "./LogoutButton";
import SidebarNav from "./SidebarNav";
import MobileNav from "./MobileNav";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על",
  company_admin: "מנהל חברה",
  project_manager: "מנהל פרויקט",
  field_worker: "עובד שטח (פועל)",
  consultant: "יועץ",
  client: "לקוח",
};

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "בית", icon: "🏠" },
  { href: "/projects", label: "פרויקטים", icon: "🏗️" },
  { href: "/tasks", label: "משימות", icon: "✅" },
  { href: "/critical-path", label: "מפת ענף", icon: "🔗" },
  { href: "/calendar", label: "יומן", icon: "📅" },
  { href: "/photos", label: "תמונות", icon: "📷" },
  { href: "/materials", label: "חומרים", icon: "📦" },
  { href: "/equipment", label: "ציוד ומכונות", icon: "🚜" },
  { href: "/documents", label: "מסמכים וביטוחים", icon: "📄" },
  { href: "/alerts", label: "התראות", icon: "🔔" },
  { href: "/search", label: "חיפוש", icon: "🔍" },
];

const MANAGER_NAV_ITEMS = [
  { href: "/reports", label: "דוחות", icon: "📊" },
  { href: "/templates", label: "תבניות", icon: "📋" },
];

const ADMIN_NAV_ITEM = { href: "/users", label: "משתמשים", icon: "👥" };
const COMPANY_NAV_ITEM = { href: "/company", label: "החברה", icon: "🏢" };
const SUPER_ADMIN_NAV_ITEM = { href: "/settings", label: "הגדרות", icon: "⚙️" };

// Field workers (laborers) get a focused menu: their projects, their tasks,
// and the day-to-day tools — not the company-wide management screens.
const WORKER_NAV_ITEMS = [
  { href: "/dashboard", label: "בית", icon: "🏠" },
  { href: "/projects", label: "פרויקטים", icon: "🏗️" },
  { href: "/tasks", label: "משימות", icon: "✅" },
  { href: "/calendar", label: "יומן", icon: "📅" },
  { href: "/photos", label: "תמונות", icon: "📷" },
];

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.role === "super_admin" || session.role === "company_admin";
  const canManage = MANAGE_ROLES.includes(session.role);
  const isWorker = session.role === "field_worker";
  const navItems = isWorker ? [...WORKER_NAV_ITEMS] : [...BASE_NAV_ITEMS];
  if (canManage) {
    navItems.push(...MANAGER_NAV_ITEMS);
  }
  if (isAdmin) {
    navItems.push(ADMIN_NAV_ITEM, COMPANY_NAV_ITEM);
  }
  if (session.role === "super_admin") {
    navItems.push(SUPER_ADMIN_NAV_ITEM);
  }

  return (
    <div className="flex flex-1 min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-s border-gray-200 bg-white p-4 flex-col gap-1">
        <div className="text-xl font-bold mb-6 px-2">Builder</div>
        <SidebarNav items={navItems} />
        <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
          <div className="px-2">
            <p className="text-sm font-medium">{session.name}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[session.role] ?? session.role}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <span className="text-lg font-bold">Builder</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{session.name}</span>
          <LogoutButton compact />
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-28 md:pb-6">{children}</main>

      <MobileNav items={navItems} canManage={canManage} />
    </div>
  );
}
