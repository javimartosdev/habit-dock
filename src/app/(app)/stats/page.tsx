import { eachDayOfInterval, subDays } from "date-fns";
import { Card } from "@/components/ui";
import { StreakBadge } from "@/components/habit-calendar";
import {
  computeStreak,
  isPerfectDay,
  type HabitSchedule,
} from "@/lib/habits";
import {
  getHabitLogsMap,
  getUserHabits,
  getUserTasks,
} from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { formatDateKey } from "@/lib/utils";

export default async function StatsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const userHabits = await getUserHabits(user.id);
  const logsMap = await getHabitLogsMap(userHabits, 12);
  const openTasks = await getUserTasks(user.id);

  const today = new Date();
  const last30 = eachDayOfInterval({
    start: subDays(today, 29),
    end: today,
  });

  const habitSchedules: HabitSchedule[] = userHabits.map((h) => ({
    kind: h.kind,
    scheduleDays: h.scheduleDays,
    weeklyTarget: h.weeklyTarget,
  }));

  const logsByHabitForPerfect = new Map<
    string,
    { logDate: string; completed: boolean }[]
  >();
  userHabits.forEach((h, i) => {
    logsByHabitForPerfect.set(
      JSON.stringify(habitSchedules[i]),
      logsMap.get(h.id) ?? [],
    );
  });

  let perfectDays = 0;
  for (const day of last30) {
    if (
      isPerfectDay(
        day,
        habitSchedules,
        logsByHabitForPerfect,
      )
    ) {
      perfectDays++;
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Estadísticas</h1>
        <p className="mt-1 text-muted">Tus rachas y progreso</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Días perfectos (30d)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {perfectDays}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Tasks pendientes</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {openTasks.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Hábitos activos</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {userHabits.length}
          </p>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Rachas por hábito</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {userHabits.map((habit) => {
            const streak = computeStreak(
              {
                kind: habit.kind,
                scheduleDays: habit.scheduleDays,
                weeklyTarget: habit.weeklyTarget,
              },
              logsMap.get(habit.id) ?? [],
            );

            const logs = logsMap.get(habit.id) ?? [];
            const last30Active = last30.filter((d) =>
              habit.scheduleDays.includes(d.getDay()),
            );
            const completedCount = last30Active.filter((d) =>
              logs.some(
                (l) =>
                  l.logDate === formatDateKey(d) && l.completed,
              ),
            ).length;
            const rate =
              last30Active.length > 0
                ? Math.round((completedCount / last30Active.length) * 100)
                : 0;

            return (
              <Card key={habit.id} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <h3 className="font-medium">{habit.name}</h3>
                </div>
                <StreakBadge
                  current={streak.current}
                  longest={streak.longest}
                />
                <p className="mt-4 text-sm text-muted">
                  Cumplimiento 30d:{" "}
                  <span className="text-foreground font-medium">{rate}%</span>
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
