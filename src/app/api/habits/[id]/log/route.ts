import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { evaluateRankAwardsForDate } from "@/lib/rank-progress";
import { rankIconSrc } from "@/lib/ranks";
import { getSessionUser } from "@/lib/session";
import { formatDateKey } from "@/lib/utils";

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  completed: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: habitId } = await params;

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const logDate = parsed.data.date ?? formatDateKey(new Date());

  const [existing] = await db
    .select()
    .from(habitLogs)
    .where(
      and(eq(habitLogs.habitId, habitId), eq(habitLogs.logDate, logDate)),
    )
    .limit(1);

  let row;
  let status = 200;

  if (existing) {
    [row] = await db
      .update(habitLogs)
      .set({ completed: parsed.data.completed })
      .where(eq(habitLogs.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(habitLogs)
      .values({
        habitId,
        logDate,
        completed: parsed.data.completed,
      })
      .returning();
    status = 201;
  }

  const rank = await evaluateRankAwardsForDate(user.id, logDate);

  return NextResponse.json(
    {
      ...row,
      rank: {
        points: rank.points,
        rankIndex: rank.rankIndex,
        previousRankIndex: rank.previousRankIndex,
        leveledUp: rank.leveledUp,
        nextRankIndex: rank.nextRankIndex,
        pointsToNext: rank.pointsToNext,
        iconSrc: rankIconSrc(rank.rankIndex),
      },
    },
    { status },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: habitId } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const conditions = [eq(habitLogs.habitId, habitId)];
  if (from) conditions.push(eq(habitLogs.logDate, from)); // simplified - use gte/lte in production

  const logs = await db
    .select()
    .from(habitLogs)
    .where(and(...conditions));

  return NextResponse.json(logs);
}
