import { addDays, eachDayOfInterval, startOfWeek } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { rankAwards, users } from "@/db/schema";
import {
  computeGlobalDayStatus,
  computeWeekStatus,
  type HabitWithSchedule,
} from "@/lib/habits";
import { getHabitLogsMap, getUserHabits } from "@/lib/data";
import {
  POINTS_OPTIMAL_DAY,
  POINTS_PERFECT_WEEK,
  dayAwardKey,
  pointsToNextRank,
  rankIndexFromPoints,
  weekAwardKey,
} from "@/lib/ranks";
import { formatDateKey, parseDateKey } from "@/lib/utils";

export type RankSnapshot = {
  points: number;
  rankIndex: number;
  nextRankIndex: number | null;
  pointsToNext: number | null;
  nextThreshold: number | null;
  leveledUp: boolean;
  previousRankIndex: number;
};

function toSchedule(h: {
  id: string;
  kind: HabitWithSchedule["kind"];
  scheduleDays: number[];
  weeklyTarget: number | null;
}): HabitWithSchedule {
  return {
    id: h.id,
    kind: h.kind,
    scheduleDays: h.scheduleDays,
    weeklyTarget: h.weeklyTarget,
  };
}

async function getPoints(userId: string): Promise<number> {
  const [row] = await db
    .select({ rankPoints: users.rankPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.rankPoints ?? 0;
}

async function recountPoints(userId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${rankAwards.points}), 0)`.mapWith(Number),
    })
    .from(rankAwards)
    .where(eq(rankAwards.userId, userId));

  const total = row?.total ?? 0;
  await db
    .update(users)
    .set({ rankPoints: total })
    .where(eq(users.id, userId));
  return total;
}

async function tryAward(
  userId: string,
  awardKey: string,
  points: number,
): Promise<boolean> {
  const inserted = await db
    .insert(rankAwards)
    .values({ userId, awardKey, points })
    .onConflictDoNothing({
      target: [rankAwards.userId, rankAwards.awardKey],
    })
    .returning({ id: rankAwards.id });

  if (inserted.length === 0) return false;

  await db
    .update(users)
    .set({ rankPoints: sql`${users.rankPoints} + ${points}` })
    .where(eq(users.id, userId));
  return true;
}

function snapshot(
  points: number,
  previousRankIndex: number,
  leveledUp: boolean,
): RankSnapshot {
  const progress = pointsToNextRank(points);
  return {
    points,
    ...progress,
    leveledUp,
    previousRankIndex,
  };
}

/**
 * After a habit log change, award day/week points if thresholds are newly met.
 * Points never decrease (we do not revoke awards).
 */
export async function evaluateRankAwardsForDate(
  userId: string,
  dateKey: string,
): Promise<RankSnapshot> {
  const beforePoints = await getPoints(userId);
  const previousRankIndex = rankIndexFromPoints(beforePoints);

  const userHabits = await getUserHabits(userId);
  if (userHabits.length === 0) {
    return snapshot(beforePoints, previousRankIndex, false);
  }

  const allHabits = userHabits.map(toSchedule);
  const logsMap = await getHabitLogsMap(userHabits, 18);
  const today = new Date();
  const date = parseDateKey(dateKey);

  if (computeGlobalDayStatus(date, allHabits, logsMap, today) === "optimal") {
    await tryAward(userId, dayAwardKey(dateKey), POINTS_OPTIMAL_DAY);
  }

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekKey = formatDateKey(weekStart);
  if (computeWeekStatus(weekStart, allHabits, logsMap, today) === "perfect") {
    await tryAward(userId, weekAwardKey(weekKey), POINTS_PERFECT_WEEK);
  }

  const afterPoints = await getPoints(userId);
  const afterRank = rankIndexFromPoints(afterPoints);
  return snapshot(
    afterPoints,
    previousRankIndex,
    afterRank > previousRankIndex,
  );
}

/** Backfill awards from history (idempotent). Call on rank fetch with sync=1. */
export async function syncRankProgressFromHistory(
  userId: string,
  monthsBack = 18,
): Promise<RankSnapshot> {
  const beforePoints = await getPoints(userId);
  const previousRankIndex = rankIndexFromPoints(beforePoints);

  const userHabits = await getUserHabits(userId);
  if (userHabits.length === 0) {
    return snapshot(beforePoints, previousRankIndex, false);
  }

  const allHabits = userHabits.map(toSchedule);
  const logsMap = await getHabitLogsMap(userHabits, monthsBack);
  const today = new Date();
  const from = addDays(today, -Math.round(monthsBack * 30.5));

  const days = eachDayOfInterval({ start: from, end: today });
  const weekKeys = new Set<string>();
  const pending: { userId: string; awardKey: string; points: number }[] = [];

  for (const day of days) {
    const key = formatDateKey(day);
    if (computeGlobalDayStatus(day, allHabits, logsMap, today) === "optimal") {
      pending.push({
        userId,
        awardKey: dayAwardKey(key),
        points: POINTS_OPTIMAL_DAY,
      });
    }
    weekKeys.add(formatDateKey(startOfWeek(day, { weekStartsOn: 1 })));
  }

  for (const weekKey of weekKeys) {
    const weekStart = parseDateKey(weekKey);
    if (computeWeekStatus(weekStart, allHabits, logsMap, today) === "perfect") {
      pending.push({
        userId,
        awardKey: weekAwardKey(weekKey),
        points: POINTS_PERFECT_WEEK,
      });
    }
  }

  if (pending.length > 0) {
    // Insert in chunks to avoid huge payloads
    const chunkSize = 100;
    for (let i = 0; i < pending.length; i += chunkSize) {
      await db
        .insert(rankAwards)
        .values(pending.slice(i, i + chunkSize))
        .onConflictDoNothing({
          target: [rankAwards.userId, rankAwards.awardKey],
        });
    }
  }

  const afterPoints = await recountPoints(userId);
  return snapshot(afterPoints, previousRankIndex, false);
}

export async function getRankSnapshot(userId: string): Promise<RankSnapshot> {
  const points = await getPoints(userId);
  const rankIndex = rankIndexFromPoints(points);
  return snapshot(points, rankIndex, false);
}
