"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type NavItem = { href: string; label: string; icon: string };

function FabInner({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!canManage) return null;

  // Context-aware quick action: the main "create" for the screen you're on.
  let target: { href: string; label: string } | null = null;
  if (pathname === "/projects") {
    target = { href: "/projects/new", label: "פרויקט חדש" };
  } else if (pathname === "/tasks") {
    const projectId = searchParams.get("projectId");
    if (projectId) target = { href: `/tasks/new?projectId=${projectId}`, label: "משימה חדשה" };
  }

  if (!target) return null;

  return (
    <Link
      href={target.href}
      aria-label={target.label}
      className="md:hidden fixed bottom-24 left-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl font-light text-white shadow-lg shadow-emerald-900/50 active:scale-95 transition-transform"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      +
    </Link>
  );
}

export default function MobileNav({
  items,
  canManage,
}: {
  items: NavItem[];
  canManage: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <Suspense fallback={null}>
        <FabInner canManage={canManage} />
      </Suspense>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-10 grid border-t border-zinc-800 bg-zinc-900/95 backdrop-blur"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                active ? "text-emerald-400" : "text-zinc-400 active:text-white"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={active ? "font-semibold" : ""}>{item.label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
