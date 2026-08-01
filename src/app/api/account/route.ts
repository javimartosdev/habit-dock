import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

const schema = z.object({
  confirm: z.literal("BORRAR"),
});

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Escribe BORRAR para confirmar' },
      { status: 400 },
    );
  }

  await db.delete(users).where(eq(users.id, sessionUser.id));

  return NextResponse.json({ ok: true });
}
