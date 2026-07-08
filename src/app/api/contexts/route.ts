import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contexts } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserContexts } from "@/lib/data";

const contextSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getUserContexts(user.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = contextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await getUserContexts(user.id);

  const [row] = await db
    .insert(contexts)
    .values({
      userId: user.id,
      name: parsed.data.name,
      icon: parsed.data.icon ?? "folder",
      color: parsed.data.color ?? "#6366f1",
      sortOrder: existing.length,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.userId, user.id)));

  return NextResponse.json({ ok: true });
}
