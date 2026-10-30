import type { ReactNode } from "react";

import Link from "next/link";

import "./globals.css";

export const metadata = {
  title: "Lyric-Sync",
  description: "Automatically sync lyrics to your Plex music library",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Lyric
              <span className="text-accent">-Sync</span>
            </Link>
            <nav>
              <Link
                href="/settings"
                className="text-sm text-muted hover:text-foreground"
              >
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
