"use client";

import { useEffect } from "react";
import { useRank } from "@/components/rank-provider";
import { RankIcon } from "@/components/rank-icon";
import {
  POINTS_OPTIMAL_DAY,
  POINTS_PERFECT_WEEK,
  MAX_RANK,
  RANK_THRESHOLDS,
} from "@/lib/ranks";

export function RanksPanel() {
  const { rank, refresh } = useRank();

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  const nextThreshold =
    rank?.nextRankIndex != null
      ? RANK_THRESHOLDS[rank.nextRankIndex]
      : null;
  // Match the "pts / next" label: fill is absolute progress to the next rank.
  const progressPct =
    rank == null
      ? 0
      : nextThreshold == null
        ? 100
        : Math.min(
            100,
            Math.max(0, (rank.points / Math.max(1, nextThreshold)) * 100),
          );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Rangos
        </h1>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Progreso a largo plazo. Solo sube; fallar no te baja de rango.
        </p>
      </div>

      {rank && (
        <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-4">
            <RankIcon src={rank.iconSrc} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Rango {rank.rankIndex}
                {rank.nextRankIndex != null && (
                  <span className="text-muted/70 font-normal">
                    {" "}
                    → {rank.nextRankIndex}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted/55 tabular-nums mt-0.5">
                {nextThreshold != null ? (
                  <>
                    {rank.points.toLocaleString("es-ES")} /{" "}
                    {nextThreshold.toLocaleString("es-ES")} pts
                    <span className="text-muted/40">
                      {" "}
                      · faltan {rank.pointsToNext?.toLocaleString("es-ES")}
                    </span>
                  </>
                ) : (
                  <>
                    {rank.points.toLocaleString("es-ES")} pts · rango máximo
                  </>
                )}
              </p>
            </div>
          </div>

          <div
            className="h-1.5 overflow-hidden rounded-full bg-border/50"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso hacia el siguiente rango"
          >
            <div
              className="h-full min-w-0 rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm text-muted leading-relaxed">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <span className="text-foreground font-medium">Día completo</span>{" "}
            (todos los hábitos del día): +{POINTS_OPTIMAL_DAY} pts
          </li>
          <li>
            <span className="text-foreground font-medium">Semana perfecta</span>{" "}
            (todas las metas cumplidas): +{POINTS_PERFECT_WEEK} pts extra
          </li>
          <li>
            El primer día completo te lleva del pollito al martillo (rango 1)
          </li>
          <li>Cada rango siguiente pide más puntos acumulados</li>
        </ul>
      </div>

      <div>
        <p className="mb-2.5 text-xs text-muted">Camino de rangos</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
          {Array.from({ length: MAX_RANK + 1 }, (_, i) => {
            const current = rank?.rankIndex ?? 0;
            const locked = i > current;
            const isCurrent = rank != null && i === current;
            return (
              <div
                key={i}
                title={`Rango ${i} · ${RANK_THRESHOLDS[i].toLocaleString("es-ES")} pts`}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 ${
                  isCurrent
                    ? "border-accent/40 bg-accent/10"
                    : "border-border/50 bg-surface-elevated/50"
                } ${locked ? "opacity-40" : ""}`}
              >
                <RankIcon rankIndex={i} size="md" />
                <span className="text-[10px] tabular-nums text-muted">{i}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
