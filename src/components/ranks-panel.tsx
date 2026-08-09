"use client";

import { useEffect } from "react";
import { useRank } from "@/components/rank-provider";
import { RankIcon } from "@/components/rank-icon";
import {
  POINTS_OPTIMAL_DAY,
  POINTS_PERFECT_WEEK,
  MAX_RANK,
} from "@/lib/ranks";

export function RanksPanel() {
  const { rank, refresh } = useRank();

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

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
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-surface-elevated/80 px-4 py-3.5">
          <RankIcon src={rank.iconSrc} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Rango {rank.rankIndex}
            </p>
            <p className="text-xs text-muted">
              {rank.points.toLocaleString("es-ES")} pts
              {rank.pointsToNext != null
                ? ` · ${rank.pointsToNext.toLocaleString("es-ES")} para el siguiente`
                : " · rango máximo"}
            </p>
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
                title={`Rango ${i}`}
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
