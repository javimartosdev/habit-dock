import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { formatDateKey, parseDateKey, ALL_WEEK_DAYS } from "./utils";

export type DayStatus =
  | "inactive"
  | "pending"
  | "done"
  | "recovered"
  | "missed"
  | "week_success"
  | "week_partial";

export type HabitKind = "daily" | "weekly_quota";

export interface HabitSchedule {
  kind: HabitKind;
  scheduleDays: number[];
  weeklyTarget?: number | null;
}

export interface DayCell {
  date: string;
  dayOfWeek: number;
  status: DayStatus;
  isToday: boolean;
  isFuture: boolean;
}

function isActiveDay(date: Date, scheduleDays: number[]): boolean {
  return scheduleDays.includes(date.getDay());
}

function getCompletedMap(
  logs: { logDate: string; completed: boolean }[],
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const log of logs) {
    if (log.completed) {
      map.set(log.logDate, true);
    }
  }
  return map;
}

/** Forgiving Seinfeld: one missed active day is recovered if the next active day is done. */
export function computeDailyStatuses(
  scheduleDays: number[],
  logs: { logDate: string; completed: boolean }[],
  rangeStart: Date,
  rangeEnd: Date,
  today: Date = new Date(),
): Map<string, DayStatus> {
  const completed = getCompletedMap(logs);
  const statuses = new Map<string, DayStatus>();

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const activeDays = days.filter((d) => isActiveDay(d, scheduleDays));

  for (const day of days) {
    const key = formatDateKey(day);
    if (!isActiveDay(day, scheduleDays)) {
      statuses.set(key, "inactive");
      continue;
    }
    if (isAfter(day, today)) {
      statuses.set(key, "pending");
      continue;
    }
    if (completed.has(key)) {
      statuses.set(key, "done");
    } else {
      statuses.set(key, "missed");
    }
  }

  for (let i = 0; i < activeDays.length; i++) {
    const day = activeDays[i];
    const key = formatDateKey(day);
    if (isAfter(day, today)) continue;

    const current = statuses.get(key);
    if (current === "done" || current === "inactive") continue;

    const prev = i > 0 ? activeDays[i - 1] : null;
    const next = i < activeDays.length - 1 ? activeDays[i + 1] : null;
    const prevKey = prev ? formatDateKey(prev) : null;
    const nextKey = next ? formatDateKey(next) : null;

    const prevOk =
      !prevKey ||
      statuses.get(prevKey) === "done" ||
      statuses.get(prevKey) === "recovered";

    if (
      nextKey &&
      !isAfter(next!, today) &&
      completed.has(nextKey) &&
      prevOk &&
      current === "missed"
    ) {
      statuses.set(key, "recovered");
    }
  }

  return statuses;
}

function getWeekKey(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return formatDateKey(weekStart);
}

export function computeWeeklyStatuses(
  scheduleDays: number[],
  weeklyTarget: number,
  logs: { logDate: string; completed: boolean }[],
  rangeStart: Date,
  rangeEnd: Date,
  today: Date = new Date(),
): Map<string, DayStatus> {
  const completed = getCompletedMap(logs);
  const statuses = new Map<string, DayStatus>();

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const weekCounts = new Map<string, number>();

  for (const day of days) {
    const key = formatDateKey(day);
    if (!isActiveDay(day, scheduleDays)) {
      statuses.set(key, "inactive");
      continue;
    }
    if (isAfter(day, today)) {
      statuses.set(key, "pending");
      continue;
    }

    const wk = getWeekKey(day);
    if (completed.has(key)) {
      weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
      statuses.set(key, "done");
    } else {
      statuses.set(key, "missed");
    }
  }

  const weekSuccess = new Map<string, boolean>();
  for (const [wk, count] of weekCounts) {
    weekSuccess.set(wk, count >= weeklyTarget);
  }

  for (const day of days) {
    const key = formatDateKey(day);
    const status = statuses.get(key);
    if (status !== "done" && status !== "missed") continue;

    const wk = getWeekKey(day);
    if (weekSuccess.get(wk)) {
      statuses.set(key, "week_success");
    } else if (!isAfter(day, today) && isBefore(endOfWeek(day, { weekStartsOn: 1 }), today)) {
      if (status === "missed") statuses.set(key, "week_partial");
    }
  }

  return statuses;
}

export function buildMonthCalendar(
  month: Date,
  habit: HabitSchedule,
  logs: { logDate: string; completed: boolean }[],
  today: Date = new Date(),
): DayCell[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const statusMap =
    habit.kind === "weekly_quota" && habit.weeklyTarget
      ? computeWeeklyStatuses(
          habit.scheduleDays,
          habit.weeklyTarget,
          logs,
          gridStart,
          gridEnd,
          today,
        )
      : computeDailyStatuses(
          habit.scheduleDays,
          logs,
          gridStart,
          gridEnd,
          today,
        );

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => {
    const key = formatDateKey(day);
    return {
      date: key,
      dayOfWeek: day.getDay(),
      status: statusMap.get(key) ?? "inactive",
      isToday: isSameDay(day, today),
      isFuture: isAfter(day, today),
    };
  });
}

export function computeStreak(
  habit: HabitSchedule,
  logs: { logDate: string; completed: boolean }[],
  today: Date = new Date(),
): { current: number; longest: number; unit: "days" | "weeks" } {
  if (habit.kind === "weekly_quota" && habit.weeklyTarget) {
    return {
      ...computeWeeklyStreak(habit.weeklyTarget, logs, today),
      unit: "weeks",
    };
  }

  return { ...computeDailyStreak(habit, logs, today), unit: "days" };
}

function countCompletionsInWeek(
  logs: { logDate: string; completed: boolean }[],
  weekStart: Date,
): number {
  const completed = getCompletedMap(logs);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  let count = 0;
  for (const day of eachDayOfInterval({ start: weekStart, end: weekEnd })) {
    if (completed.has(formatDateKey(day))) count++;
  }
  return count;
}

/** Consecutive weeks where weekly quota was met. Current open week doesn't break the streak. */
function computeWeeklyStreak(
  weeklyTarget: number,
  logs: { logDate: string; completed: boolean }[],
  today: Date,
): { current: number; longest: number } {
  const rangeStart = startOfWeek(addDays(today, -365), { weekStartsOn: 1 });
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const weeks: {
    met: boolean;
    isCurrent: boolean;
    hasEnded: boolean;
  }[] = [];

  for (
    let cursor = rangeStart;
    !isAfter(cursor, thisWeekStart);
    cursor = addDays(cursor, 7)
  ) {
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
    const met = countCompletionsInWeek(logs, cursor) >= weeklyTarget;
    const isCurrent = isSameDay(cursor, thisWeekStart);
    const hasEnded = isAfter(today, weekEnd);
    weeks.push({ met, isCurrent, hasEnded });
  }

  let current = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const week = weeks[i];
    // Week still in progress and not yet met → don't break ongoing streak.
    if (week.isCurrent && !week.met) continue;
    if (week.met) {
      current++;
    } else {
      break;
    }
  }

  let longest = 0;
  let run = 0;
  for (const week of weeks) {
    if (week.isCurrent && !week.met) continue;
    if (week.met) {
      run++;
      longest = Math.max(longest, run);
    } else if (week.hasEnded) {
      run = 0;
    }
  }

  return { current, longest };
}

function computeDailyStreak(
  habit: HabitSchedule,
  logs: { logDate: string; completed: boolean }[],
  today: Date,
): { current: number; longest: number } {
  const start = addDays(today, -365);
  const statusMap = computeDailyStatuses(
    habit.scheduleDays,
    logs,
    start,
    today,
    today,
  );

  const successStatuses = new Set<DayStatus>(["done", "recovered"]);

  const days = eachDayOfInterval({ start, end: today })
    .filter((d) => habit.scheduleDays.includes(d.getDay()))
    .reverse();

  let current = 0;
  for (const day of days) {
    const status = statusMap.get(formatDateKey(day));
    if (status && successStatuses.has(status)) {
      current++;
    } else if (!isSameDay(day, today)) {
      break;
    } else if (status === "pending") {
      continue;
    } else {
      break;
    }
  }

  let longest = 0;
  let run = 0;
  const forwardDays = eachDayOfInterval({ start, end: today }).filter((d) =>
    habit.scheduleDays.includes(d.getDay()),
  );

  for (const day of forwardDays) {
    const status = statusMap.get(formatDateKey(day));
    if (status && successStatuses.has(status)) {
      run++;
      longest = Math.max(longest, run);
    } else if (status !== "pending") {
      run = 0;
    }
  }

  return { current, longest };
}

export function isPerfectDay(
  date: Date,
  userHabits: HabitSchedule[],
  logsByHabit: Map<string, { logDate: string; completed: boolean }[]>,
): boolean {
  const key = formatDateKey(date);
  if (isAfter(date, new Date())) return false;

  for (const habit of userHabits) {
    if (!habit.scheduleDays.includes(date.getDay())) continue;

    const logs = logsByHabit.get(JSON.stringify(habit)) ?? [];
    const statusMap =
      habit.kind === "weekly_quota" && habit.weeklyTarget
        ? computeWeeklyStatuses(
            habit.scheduleDays,
            habit.weeklyTarget,
            logs,
            date,
            date,
          )
        : computeDailyStatuses(
            habit.scheduleDays,
            logs,
            addDays(date, -14),
            addDays(date, 14),
          );

    const status = statusMap.get(key);
    if (
      status !== "done" &&
      status !== "recovered" &&
      status !== "week_success" &&
      status !== "pending"
    ) {
      return false;
    }
  }
  return userHabits.some((h) => h.scheduleDays.includes(date.getDay()));
}

export function monthLabel(date: Date): string {
  return format(date, "MMMM yyyy", { locale: es });
}

export function isInCurrentMonth(day: string, month: Date): boolean {
  const d = parseDateKey(day);
  return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
}

export type GlobalDayStatus =
  | "inactive"
  | "pending"
  | "partial"
  | "optimal"
  | "recovered"
  | "missed";

export type WeekStatus = "default" | "in_progress" | "perfect";

export interface HabitWithSchedule {
  id: string;
  kind: HabitKind;
  scheduleDays: number[];
  weeklyTarget?: number | null;
}

export interface GlobalDayCell {
  date: string;
  status: GlobalDayStatus;
  isToday: boolean;
  isFuture: boolean;
  inMonth: boolean;
}

export interface GlobalWeekRow {
  weekKey: string;
  status: WeekStatus;
  days: GlobalDayCell[];
}

export interface GlobalMonthCalendar {
  weeks: GlobalWeekRow[];
  monthSummary: {
    optimalDays: number;
    perfectWeeks: number;
  };
}

/** Días en los que puedes marcar el hábito (L–D para cuota semanal). */
export function isHabitLoggableOnDay(
  habit: HabitWithSchedule,
  date: Date,
): boolean {
  if (habit.kind === "weekly_quota") return true;
  return habit.scheduleDays.includes(date.getDay());
}

/** Días obligatorios (solo hábitos diarios con días fijos). */
export function isHabitRequiredOnDay(
  habit: HabitWithSchedule,
  date: Date,
): boolean {
  if (habit.kind === "weekly_quota") return false;
  return habit.scheduleDays.includes(date.getDay());
}

function hasCompletedLog(
  logs: { logDate: string; completed: boolean }[],
  dateKey: string,
): boolean {
  return logs.some((l) => l.logDate === dateKey && l.completed);
}

function isHabitSuccessfulOnDay(
  habit: HabitWithSchedule,
  date: Date,
  logs: { logDate: string; completed: boolean }[],
  today: Date,
): "done" | "recovered" | "missed" | "pending" | "inactive" {
  if (!isHabitLoggableOnDay(habit, date)) return "inactive";
  if (isAfter(date, today)) return "pending";

  const scheduleForStatus =
    habit.kind === "weekly_quota" ? [...ALL_WEEK_DAYS] : habit.scheduleDays;

  const statusMap = computeDailyStatuses(
    scheduleForStatus,
    logs,
    addDays(date, -30),
    addDays(date, 30),
    today,
  );

  const s = statusMap.get(formatDateKey(date));
  if (s === "done") return "done";
  if (s === "recovered") return "recovered";
  if (s === "pending") return "pending";
  if (habit.kind === "weekly_quota") return "pending";
  return "missed";
}

export function computeGlobalDayStatus(
  date: Date,
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  today: Date = new Date(),
): GlobalDayStatus {
  if (habits.length === 0) return "inactive";
  if (isAfter(date, today)) return "pending";

  const loggable = habits.filter((h) => isHabitLoggableOnDay(h, date));
  if (loggable.length === 0) return "inactive";

  const key = formatDateKey(date);
  const doneCount = loggable.filter((h) =>
    hasCompletedLog(logsByHabitId.get(h.id) ?? [], key),
  ).length;

  if (doneCount === loggable.length) return "optimal";
  if (doneCount > 0) return "partial";

  const required = habits.filter((h) => isHabitRequiredOnDay(h, date));
  if (required.length > 0) {
    const anyMissed = required.some(
      (h) =>
        isHabitSuccessfulOnDay(h, date, logsByHabitId.get(h.id) ?? [], today) ===
        "missed",
    );
    if (anyMissed) return "missed";
  }

  return "pending";
}

function isHabitWeekMet(
  habit: HabitWithSchedule,
  weekStart: Date,
  logs: { logDate: string; completed: boolean }[],
  today: Date,
): boolean {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (d) => !isAfter(d, today),
  );

  if (days.length === 0) return true;

  if (habit.kind === "weekly_quota" && habit.weeklyTarget) {
    const count = days.filter((d) =>
      hasCompletedLog(logs, formatDateKey(d)),
    ).length;
    return count >= habit.weeklyTarget;
  }

  const scheduledDays = days.filter((d) =>
    habit.scheduleDays.includes(d.getDay()),
  );

  if (scheduledDays.length === 0) return true;

  return scheduledDays.every(
    (d) =>
      isHabitSuccessfulOnDay(habit, d, logs, today) === "done" ||
      isHabitSuccessfulOnDay(habit, d, logs, today) === "recovered",
  );
}

export function computeWeekStatus(
  weekStart: Date,
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  today: Date = new Date(),
): WeekStatus {
  if (habits.length === 0) return "default";

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  if (isAfter(weekStart, today)) return "default";

  const allMet = habits.every((h) =>
    isHabitWeekMet(h, weekStart, logsByHabitId.get(h.id) ?? [], today),
  );

  // Mark as perfect as soon as quotas are met — don't wait for Sunday.
  if (allMet) return "perfect";

  const weekHasEnded = isAfter(today, weekEnd);
  if (!weekHasEnded) return "in_progress";

  return "default";
}

export function buildGlobalMonthCalendar(
  month: Date,
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  today: Date = new Date(),
): GlobalMonthCalendar {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: GlobalWeekRow[] = [];

  let optimalDays = 0;
  let perfectWeeks = 0;

  for (let i = 0; i < allDays.length; i += 7) {
    const weekDays = allDays.slice(i, i + 7);
    const weekStart = weekDays[0];
    const weekKey = formatDateKey(weekStart);
    const weekStatus = computeWeekStatus(
      weekStart,
      habits,
      logsByHabitId,
      today,
    );

    if (weekStatus === "perfect") perfectWeeks++;

    const days: GlobalDayCell[] = weekDays.map((day) => {
      const status = computeGlobalDayStatus(day, habits, logsByHabitId, today);
      const inMonth = isInCurrentMonth(formatDateKey(day), month);
      if (inMonth && status === "optimal") optimalDays++;
      return {
        date: formatDateKey(day),
        status,
        isToday: isSameDay(day, today),
        isFuture: isAfter(day, today),
        inMonth,
      };
    });

    weeks.push({ weekKey, status: weekStatus, days });
  }

  return { weeks, monthSummary: { optimalDays, perfectWeeks } };
}

export function isTodayOptimal(
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  today: Date = new Date(),
): boolean {
  return computeGlobalDayStatus(today, habits, logsByHabitId, today) === "optimal";
}

export function countTodayHabitsDone(
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  today: Date = new Date(),
): { done: number; total: number } {
  const active = habits.filter((h) => isHabitLoggableOnDay(h, today));
  const todayKey = formatDateKey(today);
  const done = active.filter((h) =>
    hasCompletedLog(logsByHabitId.get(h.id) ?? [], todayKey),
  ).length;
  return { done, total: active.length };
}

export type WeekOutcome = {
  weekKey: string;
  done: number;
  target: number;
  met: boolean;
  isCurrent: boolean;
  hasEnded: boolean;
};

function weekTargetForHabit(habit: HabitWithSchedule, weekStart: Date): number {
  if (habit.kind === "weekly_quota" && habit.weeklyTarget) {
    return habit.weeklyTarget;
  }
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).filter((d) =>
    habit.scheduleDays.includes(d.getDay()),
  ).length;
}

function weekDoneForHabit(
  habit: HabitWithSchedule,
  logs: { logDate: string; completed: boolean }[],
  weekStart: Date,
  today: Date,
): number {
  if (habit.kind === "weekly_quota" && habit.weeklyTarget) {
    return countCompletionsInWeek(logs, weekStart);
  }

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).filter((d) => {
    if (isAfter(d, today)) return false;
    if (!habit.scheduleDays.includes(d.getDay())) return false;
    const status = isHabitSuccessfulOnDay(habit, d, logs, today);
    return status === "done" || status === "recovered";
  }).length;
}

/** Progress for the open week (Mon–Sun). */
export function getCurrentWeekProgress(
  habit: HabitWithSchedule,
  logs: { logDate: string; completed: boolean }[],
  today: Date = new Date(),
): { done: number; target: number; met: boolean } {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const target = weekTargetForHabit(habit, weekStart);
  const done = weekDoneForHabit(habit, logs, weekStart, today);
  return { done, target, met: target > 0 && done >= target };
}

/** Recent weeks newest-last (left→right chronological for sparks). */
export function getRecentWeekOutcomes(
  habit: HabitWithSchedule,
  logs: { logDate: string; completed: boolean }[],
  weekCount: number = 8,
  today: Date = new Date(),
): WeekOutcome[] {
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const outcomes: WeekOutcome[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeekStart, -7 * i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const target = weekTargetForHabit(habit, weekStart);
    const done = weekDoneForHabit(habit, logs, weekStart, today);
    const isCurrent = isSameDay(weekStart, thisWeekStart);
    const hasEnded = isAfter(today, weekEnd);
    const met = target > 0 && done >= target;
    outcomes.push({
      weekKey: formatDateKey(weekStart),
      done,
      target,
      met,
      isCurrent,
      hasEnded,
    });
  }

  return outcomes;
}

/**
 * Compliance over ~lookbackDays:
 * - weekly_quota: % of closed weeks that met the target
 * - daily: % of scheduled past days done/recovered
 */
export function computeHabitComplianceRate(
  habit: HabitWithSchedule,
  logs: { logDate: string; completed: boolean }[],
  today: Date = new Date(),
  lookbackDays: number = 30,
): number {
  if (habit.kind === "weekly_quota" && habit.weeklyTarget) {
    const rangeStart = startOfWeek(addDays(today, -(lookbackDays - 1)), {
      weekStartsOn: 1,
    });
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    let closed = 0;
    let met = 0;

    for (
      let cursor = rangeStart;
      isBefore(cursor, thisWeekStart) || isSameDay(cursor, thisWeekStart);
      cursor = addDays(cursor, 7)
    ) {
      const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
      const isCurrent = isSameDay(cursor, thisWeekStart);
      const hasEnded = isAfter(today, weekEnd);
      if (isCurrent && !hasEnded) continue;
      if (!hasEnded && !isCurrent) continue;

      closed++;
      if (countCompletionsInWeek(logs, cursor) >= habit.weeklyTarget) met++;
    }

    return closed > 0 ? Math.round((met / closed) * 100) : 0;
  }

  const start = addDays(today, -(lookbackDays - 1));
  const days = eachDayOfInterval({ start, end: today }).filter((d) =>
    habit.scheduleDays.includes(d.getDay()),
  );
  if (days.length === 0) return 0;

  const success = days.filter((d) => {
    const status = isHabitSuccessfulOnDay(habit, d, logs, today);
    return status === "done" || status === "recovered";
  }).length;

  return Math.round((success / days.length) * 100);
}

export function countOptimalDaysInRange(
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  days: Date[],
  today: Date = new Date(),
): number {
  let count = 0;
  for (const day of days) {
    if (isAfter(day, today)) continue;
    if (computeGlobalDayStatus(day, habits, logsByHabitId, today) === "optimal") {
      count++;
    }
  }
  return count;
}

export function countPerfectWeeksInRange(
  habits: HabitWithSchedule[],
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  rangeStart: Date,
  rangeEnd: Date,
  today: Date = new Date(),
): number {
  if (habits.length === 0) return 0;

  const first = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const last = startOfWeek(rangeEnd, { weekStartsOn: 1 });
  let count = 0;

  for (
    let cursor = first;
    !isAfter(cursor, last);
    cursor = addDays(cursor, 7)
  ) {
    if (computeWeekStatus(cursor, habits, logsByHabitId, today) === "perfect") {
      count++;
    }
  }

  return count;
}

export function rankHabitsByCompliance(
  habits: Array<HabitWithSchedule & { id: string; name: string }>,
  logsByHabitId: Map<string, { logDate: string; completed: boolean }[]>,
  today: Date = new Date(),
): {
  best: { id: string; name: string; rate: number } | null;
  worst: { id: string; name: string; rate: number } | null;
} {
  if (habits.length === 0) return { best: null, worst: null };

  const ranked = habits
    .map((h) => ({
      id: h.id,
      name: h.name,
      rate: computeHabitComplianceRate(
        h,
        logsByHabitId.get(h.id) ?? [],
        today,
      ),
    }))
    .sort((a, b) => b.rate - a.rate);

  return {
    best: ranked[0] ?? null,
    worst: ranked[ranked.length - 1] ?? null,
  };
}

export const DEFAULT_CONTEXTS = [
  { name: "General", icon: "inbox", color: "#6366f1" },
  { name: "Estudiar", icon: "book-open", color: "#8b5cf6" },
  { name: "Programar", icon: "code", color: "#06b6d4" },
  { name: "Creativo", icon: "palette", color: "#f59e0b" },
] as const;
