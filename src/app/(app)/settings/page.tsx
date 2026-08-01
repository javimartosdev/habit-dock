import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SettingsForm } from "@/components/settings-form";
import { getSessionUser } from "@/lib/session";

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  return (
    <SettingsForm
      email={user?.email ?? sessionUser.email ?? ""}
      name={user?.name ?? sessionUser.name ?? "Usuario"}
    />
  );
}
