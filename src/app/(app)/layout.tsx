import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RankProvider } from "@/components/rank-provider";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <RankProvider>
      <AppShell userName={user.name ?? "Usuario"}>{children}</AppShell>
    </RankProvider>
  );
}
