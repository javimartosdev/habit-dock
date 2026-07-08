import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserTasks } from "@/lib/data";

const taskSchema = z.object({
  title: z.string().min(1).max(300),
  contextId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contextId = searchParams.get("contextId");

  const rows = await getUserTasks(user.id, contextId ?? undefined);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [row] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      title: parsed.data.title,
      contextId: parsed.data.contextId ?? null,
      priority: parsed.data.priority ?? 0,
      dueDate: parsed.data.dueDate ?? null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const schema = taskSchema.partial().extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const [row] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
