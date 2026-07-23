import { eachDayOfInterval, subDays } from "date-fns";
import { Card } from "@/components/card";
import { StreakBadge } from "@/components/streak-badge";
import {
  computeHabitComplianceRate,
  computeStreak,
  countOptimalDaysInRange,
  countPerfectWeeksInRange,
  getCurrentWeekProgress,
  getRecentWeekOutcomes,
  rankHabitsByCompliance,
  type HabitWithSchedule,
} from "@/lib/habits";
import { getHabitLogsMap, getUserHabits } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { cn, formatDateKey } from "@/lib/utils";

function normalizeLogDate(value: string | Date): string {
  if (value instanceof Date) return formatDateKey(value);
  return value.slice(0, 10);
}

function WeekSpark({
  outcomes,
}: {
  outcomes: ReturnType<typeof getRecentWeekOutcomes>;
}) {
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label="Últimas semanas">
      {outcomes.map((w) => (
        <span
          key={w.weekKey}
          title={
            w.isCurrent && !w.hasEnded
              ? w.met
                ? "Esta semana: meta cumplida"
                : `Esta semana: ${w.done}/${w.target}`
              : w.met
                ? "Semana cumplida"
                : "Semana no cumplida"
          }
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            w.met
              ? "bg-amber-500"
              : w.isCurrent && !w.hasEnded
                ? "bg-accent/50 ring-1 ring-accent/40"
                : "bg-muted/40",
          )}
        />
      ))}
    </div>
  );
}

export default async function StatsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const userHabits = await getUserHabits(user.id);
  const logsMap = await getHabitLogsMap(userHabits, 12);

  const today = new Date();
  const rangeStart = subDays(today, 29);
  const last30 = eachDayOfInterval({ start: rangeStart, end: today });

  const habitsForLogic: Array<HabitWithSchedule & { id: string; name: string }> =
    userHabits.map((h) => ({
      id: h.id,
      name: h.name,
      kind: h.kind,
      scheduleDays: h.scheduleDays,
      weeklyTarget: h.weeklyTarget,
    }));

  const logsByHabitId = new Map<
    string,
    { logDate: string; completed: boolean }[]
  >();
  for (const habit of userHabits) {
    const logs = (logsMap.get(habit.id) ?? []).map((log) => ({
      ...log,
      logDate: normalizeLogDate(log.logDate),
    }));
    logsByHabitId.set(habit.id, logs);
  }

  const optimalDays = countOptimalDaysInRange(
    habitsForLogic,
    logsByHabitId,
    last30,
    today,
  );
  const perfectWeeks = countPerfectWeeksInRange(
    habitsForLogic,
    logsByHabitId,
    rangeStart,
    today,
    today,
  );
  const { best, worst } = rankHabitsByCompliance(
    habitsForLogic,
    logsByHabitId,
    today,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Estadísticas
        </h1>
        <p className="mt-1 text-muted">Rachas, semanas y progreso de hábitos</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">Días óptimos (30d)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {optimalDays}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Semanas perfectas (30d)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {perfectWeeks}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Hábitos activos</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {userHabits.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Mejor / a mejorar (30d)</p>
          {best && worst && userHabits.length > 0 ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-success font-medium">{best.name}</span>
                <span className="ml-2 tabular-nums text-muted">{best.rate}%</span>
              </p>
              {worst.id !== best.id && (
                <p>
                  <span className="text-foreground/80 font-medium">
                    {worst.name}
                  </span>
                  <span className="ml-2 tabular-nums text-muted">
                    {worst.rate}%
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">—</p>
          )}
        </Card>
      </div>

      {userHabits.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Esta semana
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {userHabits.map((habit) => {
              const logs = logsByHabitId.get(habit.id) ?? [];
              const progress = getCurrentWeekProgress(
                {
                  id: habit.id,
                  kind: habit.kind,
                  scheduleDays: habit.scheduleDays,
                  weeklyTarget: habit.weeklyTarget,
                },
                logs,
                today,
              );
              const pct =
                progress.target > 0
                  ? Math.min(
                      100,
                      Math.round((progress.done / progress.target) * 100),
                    )
                  : 0;

              return (
                <Card key={habit.id} className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: habit.color }}
                      />
                      <span className="truncate text-sm font-medium">
                        {habit.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {progress.done}/{progress.target}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        progress.met ? "bg-amber-500" : "bg-accent",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {progress.met && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Meta de la semana cumplida
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Por hábito
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {userHabits.map((habit) => {
            const logs = logsByHabitId.get(habit.id) ?? [];
            const schedule: HabitWithSchedule = {
              id: habit.id,
              kind: habit.kind,
              scheduleDays: habit.scheduleDays,
              weeklyTarget: habit.weeklyTarget,
            };

            const streak = computeStreak(schedule, logs, today);
            const rate = computeHabitComplianceRate(schedule, logs, today);
            const progress = getCurrentWeekProgress(schedule, logs, today);
            const outcomes = getRecentWeekOutcomes(schedule, logs, 8, today);
            const rateLabel =
              habit.kind === "weekly_quota"
                ? "Cumplimiento semanal (30d)"
                : "Cumplimiento (30d)";

            return (
              <Card key={habit.id} className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <h3 className="font-medium">{habit.name}</h3>
                </div>
                <StreakBadge
                  current={streak.current}
                  longest={streak.longest}
                  unit={streak.unit}
                />
                <p className="mt-4 text-sm text-muted">
                  Esta semana:{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {progress.done}/{progress.target}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {rateLabel}:{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {rate}%
                  </span>
                </p>
                <WeekSpark outcomes={outcomes} />
                <p className="mt-1.5 text-[10px] text-muted/70">
                  Últimas 8 semanas · dorado = cumplida
                </p>
              </Card>
            );
          })}
        </div>

        {userHabits.length === 0 && (
          <Card className="p-8 text-center text-muted">
            Aún no hay hábitos para mostrar estadísticas
          </Card>
        )}
      </section>
    </div>
  );
}
