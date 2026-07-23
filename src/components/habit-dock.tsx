"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Circle, Plus, Trash2, X } from "lucide-react";
import { cn, formatDateKey, parseDateKey, WEEKDAY_PICKER } from "@/lib/utils";
import { GlobalCalendar } from "@/components/global-calendar";
import { Button, Input } from "@/components/ui";
import { useAchievementSound } from "@/hooks/use-achievement-sound";
import {
  computeGlobalDayStatus,
  computeWeekStatus,
  countTodayHabitsDone,
  getCurrentWeekProgress,
  isHabitLoggableOnDay,
  type HabitWithSchedule,
} from "@/lib/habits";
import { ALL_WEEK_DAYS } from "@/lib/utils";

const HABIT_COLORS = [
  "#3d7a4a",
  "#b4532a",
  "#2f6b8a",
  "#7a5a9a",
  "#c2811a",
  "#b33a2e",
  "#4a6b5c",
  "#8a5a3c",
];

interface HabitMeta extends HabitWithSchedule {
  name: string;
  color: string;
}

interface HabitToday extends HabitMeta {
  completedToday: boolean;
}

export function HabitDock({
  habits,
  habitMeta,
  allHabits,
  logsByHabit,
}: {
  habits: HabitToday[];
  habitMeta: HabitMeta[];
  allHabits: HabitWithSchedule[];
  logsByHabit: Record<string, { logDate: string; completed: boolean }[]>;
}) {
  const router = useRouter();
  const { unlock, play: playAchievement, playTick } = useAchievementSound();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [celebrateDate, setCelebrateDate] = useState<string | null>(null);
  const [celebrateWeek, setCelebrateWeek] = useState<string | null>(null);
  const [showHabitForm, setShowHabitForm] = useState(false);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"daily" | "weekly_quota">("weekly_quota");
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [scheduleDays, setScheduleDays] = useState<number[]>([...ALL_WEEK_DAYS]);
  const [color, setColor] = useState(HABIT_COLORS[0]);

  const logsMap = useMemo(() => {
    const m = new Map<string, { logDate: string; completed: boolean }[]>();
    for (const [id, logs] of Object.entries(logsByHabit)) {
      m.set(id, logs);
    }
    return m;
  }, [logsByHabit]);

  function toggleDay(dow: number) {
    setScheduleDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort(),
    );
  }

  function isHabitDoneOnDate(habitId: string, dateKey: string): boolean {
    return (logsByHabit[habitId] ?? []).some(
      (l) => l.logDate === dateKey && l.completed,
    );
  }

  function isDateOptimal(dateKey: string): boolean {
    const date = parseDateKey(dateKey);
    return computeGlobalDayStatus(date, allHabits, logsMap) === "optimal";
  }

  function habitsForDate(dateKey: string): HabitMeta[] {
    const date = parseDateKey(dateKey);
    return habitMeta.filter((h) => isHabitLoggableOnDay(h, date));
  }

  function weekStatusFor(
    dateKey: string,
    logs: Map<string, { logDate: string; completed: boolean }[]>,
  ) {
    const weekStart = startOfWeek(parseDateKey(dateKey), { weekStartsOn: 1 });
    return {
      weekKey: formatDateKey(weekStart),
      status: computeWeekStatus(weekStart, allHabits, logs),
    };
  }

  function withOptimisticLog(
    habitId: string,
    dateKey: string,
    completed: boolean,
  ) {
    const m = new Map<string, { logDate: string; completed: boolean }[]>();
    for (const [id, logs] of logsMap) {
      m.set(id, [...logs]);
    }
    const existing = m.get(habitId) ?? [];
    const without = existing.filter((l) => l.logDate !== dateKey);
    if (completed) {
      m.set(habitId, [...without, { logDate: dateKey, completed: true }]);
    } else {
      m.set(habitId, without);
    }
    return m;
  }

  async function toggleHabitOnDate(
    habit: HabitMeta,
    dateKey: string,
    currentlyDone: boolean,
  ) {
    unlock();

    const wasOptimal = isDateOptimal(dateKey);
    const beforeWeek = weekStatusFor(dateKey, logsMap);
    const nextCompleted = !currentlyDone;
    const optimisticLogs = withOptimisticLog(habit.id, dateKey, nextCompleted);
    const afterWeek = weekStatusFor(dateKey, optimisticLogs);

    if (nextCompleted) {
      const active = habitsForDate(dateKey);
      const doneCount = active.filter((h) =>
        h.id === habit.id ? true : isHabitDoneOnDate(h.id, dateKey),
      ).length;
      const becomesOptimal =
        !wasOptimal && doneCount >= active.length && active.length > 0;
      const becomesPerfect =
        beforeWeek.status !== "perfect" && afterWeek.status === "perfect";

      if (becomesOptimal || becomesPerfect) {
        playAchievement();
        if (becomesOptimal) {
          setCelebrateDate(dateKey);
          setTimeout(() => setCelebrateDate(null), 800);
        }
        if (becomesPerfect) {
          setCelebrateWeek(afterWeek.weekKey);
          setTimeout(() => setCelebrateWeek(null), 900);
        }
      } else {
        playTick();
      }
    }

    await fetch(`/api/habits/${habit.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateKey,
        completed: nextCompleted,
      }),
    });

    router.refresh();
  }

  async function toggleHabit(habit: HabitToday) {
    const todayKey = formatDateKey(new Date());
    await toggleHabitOnDate(habit, todayKey, habit.completedToday);
  }

  async function createHabit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || scheduleDays.length === 0) return;

    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        color,
        kind,
        weeklyTarget: kind === "weekly_quota" ? weeklyTarget : null,
        scheduleDays:
          kind === "weekly_quota" ? [...ALL_WEEK_DAYS] : scheduleDays,
      }),
    });

    setName("");
    setColor(HABIT_COLORS[0]);
    setShowHabitForm(false);
    router.refresh();
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const { done, total } = countTodayHabitsDone(allHabits, logsMap);

  const selectedHabits = selectedDate ? habitsForDate(selectedDate) : [];
  const selectedLabel = selectedDate
    ? format(parseDateKey(selectedDate), "EEEE d MMM", { locale: es })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <GlobalCalendar
        month={month}
        onMonthChange={setMonth}
        habits={allHabits}
        logsByHabit={logsByHabit}
        celebrateDate={celebrateDate}
        celebrateWeek={celebrateWeek}
        selectedDate={selectedDate}
        onDaySelect={(date) =>
          setSelectedDate((prev) => (prev === date ? null : date))
        }
      />

      {selectedDate && (
        <section className="rounded-2xl border border-border/80 bg-surface-elevated/90 p-4 shadow-sm shadow-black/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold capitalize tracking-tight">
                {selectedLabel}
              </h2>
              <p className="text-xs text-muted">
                Toca para marcar o desmarcar hábitos
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="rounded-xl p-2 text-muted hover:bg-surface-hover hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedHabits.length === 0 ? (
            <p className="text-sm text-muted">No hay hábitos activos este día.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedHabits.map((habit) => {
                const dayDone = isHabitDoneOnDate(habit.id, selectedDate);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() =>
                      toggleHabitOnDate(habit, selectedDate, dayDone)
                    }
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm transition-all duration-200 active:scale-[0.98]",
                      dayDone
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-border bg-surface hover:border-accent/35",
                    )}
                  >
                    {dayDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted" />
                    )}
                    <span className="font-medium">{habit.name}</span>
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: habit.color }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Hoy
            </h2>
            <p className="text-xs text-muted">
              {total > 0 ? `${done}/${total} hábitos` : "Sin hábitos activos hoy"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHabitForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Hábito
          </Button>
        </div>

        {habits.length > 0 && (
          <div className="space-y-2">
            {habits.map((habit) => {
              const week = getCurrentWeekProgress(habit, logsByHabit[habit.id] ?? []);
              return (
                <div key={habit.id} className="space-y-1.5">
                  <button
                    onClick={() => toggleHabit(habit)}
                    className={cn(
                      "group flex w-full min-h-12 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition-all duration-200 active:scale-[0.99]",
                      habit.completedToday
                        ? "border-success/40 bg-success/12 text-success"
                        : "border-border/80 bg-surface-elevated/90 hover:border-accent/30",
                    )}
                  >
                    {habit.completedToday ? (
                      <Check className="h-5 w-5 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted" />
                    )}
                    <span className="flex-1 font-medium">{habit.name}</span>
                    {week.target > 0 && (
                      <span className="text-xs tabular-nums text-muted">
                        {week.done}/{week.target}
                      </span>
                    )}
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHabit(habit.id);
                      }}
                      className="rounded-lg p-1.5 text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  {week.target > 0 && (
                    <div className="mx-1 h-1 overflow-hidden rounded-full bg-border/60">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          week.met ? "bg-warning" : "bg-accent/70",
                        )}
                        style={{
                          width: `${Math.min(100, Math.round((week.done / week.target) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {habits.length === 0 && (
          <p className="text-sm text-muted">
            {allHabits.length === 0
              ? "Crea tu primer hábito abajo."
              : "Marca los hábitos cuando los hagas — no hace falta todos los días."}
          </p>
        )}

        {showHabitForm && (
          <form
            onSubmit={createHabit}
            className="rounded-2xl border border-border/80 bg-surface-elevated/95 p-4 shadow-sm shadow-black/5 space-y-3"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Entrenar, Programar)"
              autoFocus
            />
            <div>
              <p className="mb-2 text-xs text-muted">Color</p>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "h-8 w-8 rounded-full transition-transform",
                      color === c
                        ? "scale-110 ring-2 ring-foreground/30 ring-offset-2 ring-offset-surface-elevated"
                        : "hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "daily" | "weekly_quota")
                }
                className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
              >
                <option value="daily">Diario</option>
                <option value="weekly_quota">Cuota semanal</option>
              </select>
              {kind === "weekly_quota" && (
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  className="w-20"
                />
              )}
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Días activos</p>
              {kind === "weekly_quota" ? (
                <p className="text-xs text-muted/80 leading-relaxed">
                  Marca cualquier día de la semana (L–D). La meta es{" "}
                  <span className="text-foreground font-medium">
                    {weeklyTarget} días
                  </span>
                  , no tienen que ser seguidos ni de lunes a viernes.
                </p>
              ) : (
                <div className="flex gap-1.5">
                  {WEEKDAY_PICKER.map(({ dow, label, name: dayName }) => (
                    <button
                      key={dow}
                      type="button"
                      title={dayName}
                      onClick={() => toggleDay(dow)}
                      className={cn(
                        "h-9 w-9 rounded-xl text-xs font-medium",
                        scheduleDays.includes(dow)
                          ? "bg-accent/20 text-accent"
                          : "bg-surface-hover text-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" size="sm" className="w-full">
              Crear hábito
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
