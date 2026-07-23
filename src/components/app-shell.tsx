"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronLeft, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const isStats = pathname === "/stats";

  return (
    <div className="min-h-full flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {isStats ? (
              <Link
                href="/"
                className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors -ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Dock
              </Link>
            ) : (
              <BrandLogo variant="header" />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            {!isStats && (
              <Link
                href="/stats"
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Stats
              </Link>
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
