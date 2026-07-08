import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  contexts,
  habitLogs,
  habits,
  tasks,
  type Habit,
  type HabitLog,
} from "@/db/schema";
import { formatDateKey } from "@/lib/utils";

export async function getUserContexts(userId: string) {
  return db
    .select()
    .from(contexts)
    .where(eq(contexts.userId, userId))
    .orderBy(asc(contexts.sortOrder));
}

export async function getUserTasks(userId: string, contextId?: string | null) {
  const conditions = [eq(tasks.userId, userId), isNull(tasks.completedAt)];

  if (contextId) {
    conditions.push(eq(tasks.contextId, contextId));
  }

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      contextId: tasks.contextId,
      contextName: contexts.name,
      contextColor: contexts.color,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(and(...conditions))
    .orderBy(desc(tasks.priority), asc(tasks.dueDate), desc(tasks.createdAt));
}

export async function getUserHabits(userId: string) {
  return db
    .select()
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
}

export async function getHabitLogsForRange(
  habitIds: string[],
  from: string,
  to: string,
) {
  if (habitIds.length === 0) return [] as HabitLog[];

  return db
    .select()
    .from(habitLogs)
    .where(
      and(
        inArray(habitLogs.habitId, habitIds),
        gte(habitLogs.logDate, from),
        lte(habitLogs.logDate, to),
      ),
    );
}

export async function getHabitLogsMap(
  userHabits: Habit[],
  monthsBack = 6,
): Promise<Map<string, { logDate: string; completed: boolean }[]>> {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - monthsBack);

  const habitIds = userHabits.map((h) => h.id);
  const logs = await getHabitLogsForRange(
    habitIds,
    formatDateKey(from),
    formatDateKey(today),
  );

  const map = new Map<string, { logDate: string; completed: boolean }[]>();
  for (const habit of userHabits) {
    map.set(
      habit.id,
      logs
        .filter((l) => l.habitId === habit.id)
        .map((l) => ({ logDate: l.logDate, completed: l.completed })),
    );
  }
  return map;
}

export async function getTodayHabitsWithStatus(userId: string) {
  const userHabits = await getUserHabits(userId);
  const today = new Date();
  const todayKey = formatDateKey(today);
  const dayOfWeek = today.getDay();

  const activeToday = userHabits.filter((h) =>
    h.kind === "weekly_quota" || h.scheduleDays.includes(dayOfWeek),
  );

  const logs = await getHabitLogsForRange(
    activeToday.map((h) => h.id),
    todayKey,
    todayKey,
  );

  return activeToday.map((habit) => {
    const log = logs.find((l) => l.habitId === habit.id);
    return {
      ...habit,
      completedToday: log?.completed ?? false,
      logId: log?.id,
    };
  });
}

export async function getDockTasks(userId: string, contextId?: string | null) {
  const todayKey = formatDateKey(new Date());

  const conditions = [
    eq(tasks.userId, userId),
    isNull(tasks.completedAt),
    or(isNull(tasks.dueDate), lte(tasks.dueDate, todayKey)),
  ];

  if (contextId) {
    conditions.push(eq(tasks.contextId, contextId));
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      contextId: tasks.contextId,
      contextName: contexts.name,
      contextColor: contexts.color,
    })
    .from(tasks)
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(and(...conditions))
    .orderBy(desc(tasks.priority), asc(tasks.dueDate))
    .limit(12);

  return rows;
}
