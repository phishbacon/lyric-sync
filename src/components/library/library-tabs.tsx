"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const views = [
  { label: "Artists", href: "/library" },
  { label: "Albums", href: "/library/albums" },
  { label: "Tracks", href: "/library/tracks" },
] as const;

export function LibraryTabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [saved, setSaved] = useState<Record<string, string>>({});

  useEffect(() => {
    const snapshot: Record<string, string> = {};
    for (const view of views) snapshot[view.href] = sessionStorage.getItem(`library-view:${view.href}`) ?? "";
    setSaved(snapshot);
  }, []);

  useEffect(() => {
    if (!views.some(view => view.href === pathname)) return;
    const value = search.toString();
    sessionStorage.setItem(`library-view:${pathname}`, value);
    setSaved(previous => previous[pathname] === value ? previous : { ...previous, [pathname]: value });
  }, [pathname, search]);

  return (
    <nav aria-label="Library views" className="flex gap-1 border-b border-border">
      {views.map(view => {
        const active = view.href === pathname;
        const suffix = saved[view.href];
        return (
          <Link key={view.href}
            href={view.href + (suffix ? `?${suffix}` : "")}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${active
              ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
