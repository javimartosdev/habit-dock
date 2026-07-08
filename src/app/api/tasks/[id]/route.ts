import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await _request.json();

  if (body.action === "complete") {
    const [row] = await db
      .update(tasks)
      .set({ completedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  if (body.action === "reopen") {
    const [row] = await db
      .update(tasks)
      .set({ completedAt: null })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  return NextResponse.json({ ok: true });
}
