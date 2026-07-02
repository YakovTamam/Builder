"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type NavItem = { href: string; label: string; icon: string };

// How many items sit directly on the bottom bar before the "more" sheet.
const PRIMARY_COUNT = 4;

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
      className="md:hidden fixed bottom-24 left-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl font-light text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform"
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
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Keep the bottom bar legible: show a few primary items, tuck the rest
  // behind a "more" sheet so nothing gets squeezed to an unusable width.
  const hasOverflow = items.length > PRIMARY_COUNT + 1;
  const primary = hasOverflow ? items.slice(0, PRIMARY_COUNT) : items;
  const overflow = hasOverflow ? items.slice(PRIMARY_COUNT) : [];
  const overflowActive = overflow.some((item) => isActive(item.href));
  const columns = primary.length + (hasOverflow ? 1 : 0);

  return (
    <>
      <Suspense fallback={null}>
        <FabInner canManage={canManage} />
      </Suspense>

      {/* "More" sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-gray-200 bg-white p-4 pb-8 shadow-2xl"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
            <div className="grid grid-cols-4 gap-2">
              {overflow.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] ${
                      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                    <span className="text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-10 grid border-t border-gray-200 bg-white/95 backdrop-blur"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {primary.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                active ? "text-emerald-600" : "text-gray-500 active:text-emerald-600"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={active ? "font-semibold" : ""}>{item.label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-600" />
              )}
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
              overflowActive || moreOpen ? "text-emerald-600" : "text-gray-500 active:text-emerald-600"
            }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span className={overflowActive || moreOpen ? "font-semibold" : ""}>עוד</span>
            {overflowActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-600" />
            )}
          </button>
        )}
      </nav>
    </>
  );
}
