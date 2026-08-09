"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Circle, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn, formatDateKey, parseDateKey, WEEKDAY_PICKER } from "@/lib/utils";
import { GlobalCalendar } from "@/components/global-calendar";
import { Button, Input } from "@/components/ui";
import { useRank } from "@/components/rank-provider";
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

type LogEntry = { logDate: string; completed: boolean };
type LogsByHabit = Record<string, LogEntry[]>;

interface HabitMeta extends HabitWithSchedule {
  name: string;
  color: string;
}

function nearestColor(hex: string): string {
  const normalized = hex.toLowerCase();
  if (HABIT_COLORS.includes(normalized)) return normalized;
  return HABIT_COLORS[0];
}

function patchLogs(
  prev: LogsByHabit,
  habitId: string,
  dateKey: string,
  completed: boolean,
): LogsByHabit {
  const existing = prev[habitId] ?? [];
  const without = existing.filter((l) => l.logDate !== dateKey);
  return {
    ...prev,
    [habitId]: completed
      ? [...without, { logDate: dateKey, completed: true }]
      : without,
  };
}

function toLogsMap(logs: LogsByHabit) {
  const m = new Map<string, LogEntry[]>();
  for (const [id, entries] of Object.entries(logs)) {
    m.set(id, entries);
  }
  return m;
}

export function HabitDock({
  habitMeta,
  allHabits,
  logsByHabit,
}: {
  habitMeta: HabitMeta[];
  allHabits: HabitWithSchedule[];
  logsByHabit: LogsByHabit;
}) {
  const router = useRouter();
  const { applyRankUpdate } = useRank();
  const { unlock, play: playAchievement, playTick } = useAchievementSound();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [celebrateDate, setCelebrateDate] = useState<string | null>(null);
  const [celebrateWeek, setCelebrateWeek] = useState<string | null>(null);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [localLogs, setLocalLogs] = useState<LogsByHabit>(logsByHabit);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"daily" | "weekly_quota">("weekly_quota");
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [scheduleDays, setScheduleDays] = useState<number[]>([...ALL_WEEK_DAYS]);
  const [color, setColor] = useState(HABIT_COLORS[0]);

  useEffect(() => {
    setLocalLogs(logsByHabit);
  }, [logsByHabit]);

  const logsMap = useMemo(() => toLogsMap(localLogs), [localLogs]);
  const todayKey = formatDateKey(new Date());

  function resetForm() {
    setName("");
    setKind("weekly_quota");
    setWeeklyTarget(5);
    setScheduleDays([...ALL_WEEK_DAYS]);
    setColor(HABIT_COLORS[0]);
    setEditingId(null);
    setFormError("");
  }

  function openCreateForm() {
    resetForm();
    setShowHabitForm(true);
  }

  function openEditForm(habit: HabitMeta) {
    setEditingId(habit.id);
    setName(habit.name);
    setKind(habit.kind);
    setWeeklyTarget(habit.weeklyTarget ?? 5);
    setScheduleDays(
      habit.kind === "weekly_quota"
        ? [...ALL_WEEK_DAYS]
        : [...habit.scheduleDays],
    );
    setColor(nearestColor(habit.color));
    setFormError("");
    setShowHabitForm(true);
  }

  function closeForm() {
    setShowHabitForm(false);
    resetForm();
  }

  function toggleDay(dow: number) {
    setScheduleDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort(),
    );
  }

  function isHabitDoneOnDate(habitId: string, dateKey: string): boolean {
    return (localLogs[habitId] ?? []).some(
      (l) => l.logDate === dateKey && l.completed,
    );
  }

  function isDateOptimal(
    dateKey: string,
    logs: Map<string, LogEntry[]>,
  ): boolean {
    const date = parseDateKey(dateKey);
    return computeGlobalDayStatus(date, allHabits, logs) === "optimal";
  }

  function habitsForDate(dateKey: string): HabitMeta[] {
    const date = parseDateKey(dateKey);
    return habitMeta.filter((h) => isHabitLoggableOnDay(h, date));
  }

  function weekStatusFor(
    dateKey: string,
    logs: Map<string, LogEntry[]>,
  ) {
    const weekStart = startOfWeek(parseDateKey(dateKey), { weekStartsOn: 1 });
    return {
      weekKey: formatDateKey(weekStart),
      status: computeWeekStatus(weekStart, allHabits, logs),
    };
  }

  function toggleHabitOnDate(
    habit: HabitMeta,
    dateKey: string,
    currentlyDone: boolean,
  ) {
    unlock();

    const nextCompleted = !currentlyDone;
    const optimistic = patchLogs(localLogs, habit.id, dateKey, nextCompleted);
    const optimisticMap = toLogsMap(optimistic);

    const wasOptimal = isDateOptimal(dateKey, logsMap);
    const beforeWeek = weekStatusFor(dateKey, logsMap);
    const afterWeek = weekStatusFor(dateKey, optimisticMap);

    setLocalLogs(optimistic);

    if (nextCompleted) {
      const active = habitsForDate(dateKey);
      const doneCount = active.filter((h) =>
        h.id === habit.id
          ? true
          : (optimistic[h.id] ?? []).some(
              (l) => l.logDate === dateKey && l.completed,
            ),
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

    void fetch(`/api/habits/${habit.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateKey,
        completed: nextCompleted,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          setLocalLogs((prev) =>
            patchLogs(prev, habit.id, dateKey, currentlyDone),
          );
          return;
        }
        const data = (await res.json().catch(() => null)) as {
          rank?: {
            points: number;
            rankIndex: number;
            leveledUp?: boolean;
            nextRankIndex?: number | null;
            pointsToNext?: number | null;
            iconSrc?: string;
          };
        } | null;
        if (data?.rank) applyRankUpdate(data.rank);
      })
      .catch(() => {
        setLocalLogs((prev) =>
          patchLogs(prev, habit.id, dateKey, currentlyDone),
        );
      });
  }

  function toggleHabit(habit: HabitMeta) {
    toggleHabitOnDate(habit, todayKey, isHabitDoneOnDate(habit.id, todayKey));
  }

  async function saveHabit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Escribe un nombre");
      return;
    }
    if (kind === "daily" && scheduleDays.length === 0) {
      setFormError("Elige al menos un día activo");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name: name.trim(),
      color,
      kind,
      weeklyTarget: kind === "weekly_quota" ? weeklyTarget : null,
      scheduleDays: kind === "weekly_quota" ? [...ALL_WEEK_DAYS] : scheduleDays,
    };

    const res = await fetch("/api/habits", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId ? { id: editingId, ...payload } : payload,
      ),
    });

    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setFormError(data?.error ?? "No se pudo guardar el hábito");
      return;
    }

    closeForm();
    router.refresh();
  }

  async function deleteHabit(habit: HabitMeta) {
    const ok = window.confirm(
      `¿Borrar «${habit.name}»? Se perderá su historial de marcas.`,
    );
    if (!ok) return;

    const res = await fetch(`/api/habits?id=${habit.id}`, { method: "DELETE" });
    if (!res.ok) {
      setFormError("No se pudo borrar el hábito");
      setShowHabitForm(true);
      return;
    }

    if (editingId === habit.id) closeForm();
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
        logsByHabit={localLogs}
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
            onClick={() => {
              if (showHabitForm && !editingId) closeForm();
              else openCreateForm();
            }}
          >
            <Plus className="h-4 w-4" />
            Hábito
          </Button>
        </div>

        {habitMeta.length > 0 && (
          <div className="space-y-2">
            {habitMeta.map((habit) => {
              const canToggleToday = isHabitLoggableOnDay(habit, new Date());
              const completedToday = isHabitDoneOnDate(habit.id, todayKey);
              const week = getCurrentWeekProgress(
                habit,
                localLogs[habit.id] ?? [],
              );

              return (
                <div key={habit.id} className="space-y-1.5">
                  <div
                    className={cn(
                      "flex w-full min-h-12 items-center gap-2 rounded-2xl border px-2.5 py-2 text-sm transition-all",
                      completedToday
                        ? "border-success/40 bg-success/12 text-success"
                        : "border-border/80 bg-surface-elevated/90",
                    )}
                  >
                    <button
                      type="button"
                      disabled={!canToggleToday}
                      onClick={() => {
                        if (canToggleToday) toggleHabit(habit);
                      }}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 text-left active:scale-[0.99]",
                        !canToggleToday && "opacity-60 cursor-default",
                      )}
                      aria-label={
                        canToggleToday
                          ? completedToday
                            ? `Desmarcar ${habit.name}`
                            : `Marcar ${habit.name}`
                          : `${habit.name} (no activo hoy)`
                      }
                    >
                      {completedToday ? (
                        <Check className="h-5 w-5 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted" />
                      )}
                      <span className="flex-1 font-medium text-foreground">
                        {habit.name}
                      </span>
                      {week.target > 0 && (
                        <span className="text-xs tabular-nums text-muted">
                          {week.done}/{week.target}
                        </span>
                      )}
                      <span
                        className="h-3 w-3 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: habit.color }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(habit)}
                      className="rounded-xl p-2 text-muted hover:bg-surface-hover hover:text-foreground"
                      aria-label={`Editar ${habit.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteHabit(habit)}
                      className="rounded-xl p-2 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Borrar ${habit.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

        {habitMeta.length === 0 && (
          <p className="text-sm text-muted">Crea tu primer hábito abajo.</p>
        )}

        {showHabitForm && (
          <form
            onSubmit={saveHabit}
            className="rounded-2xl border border-border/80 bg-surface-elevated/95 p-4 shadow-sm shadow-black/5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold tracking-tight">
                {editingId ? "Editar hábito" : "Nuevo hábito"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Cerrar formulario"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
            {formError && (
              <p className="text-sm text-danger">{formError}</p>
            )}
            <Button type="submit" size="sm" className="w-full" disabled={saving}>
              {saving
                ? "Guardando…"
                : editingId
                  ? "Guardar cambios"
                  : "Crear hábito"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
