import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "דף הבית" },
  { href: "/projects", label: "פרויקטים" },
  { href: "/tasks", label: "משימות" },
  { href: "/photos", label: "תמונות מהשטח" },
  { href: "/materials", label: "לוגיסטיקה וחומרים" },
  { href: "/alerts", label: "התראות" },
];

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 min-h-screen">
      <aside className="w-64 shrink-0 border-s border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1">
        <div className="text-xl font-bold mb-6 px-2">Builder</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
