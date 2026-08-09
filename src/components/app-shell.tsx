"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronLeft, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/brand-logo";
import { RankBadge } from "@/components/rank-badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const showBack =
    pathname === "/stats" ||
    pathname === "/settings" ||
    pathname === "/ranks";

  return (
    <div className="min-h-full flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {showBack ? (
              <div className="flex items-center gap-2 -ml-2">
                <Link
                  href="/"
                  className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Dock
                </Link>
                <RankBadge />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <BrandLogo variant="header" />
                <RankBadge />
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            {!showBack && (
              <>
                <Link
                  href="/stats"
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                  aria-label="Stats"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Stats
                </Link>
                <Link
                  href="/settings"
                  className="rounded-xl p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                  aria-label="Cuenta"
                  title="Cuenta"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              title={`Salir (${userName})`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
