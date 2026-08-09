"use client";

import { useEffect } from "react";
import { rankIconSrc } from "@/lib/ranks";

export function RankLevelUp({
  rankIndex,
  onDone,
}: {
  rankIndex: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/55 backdrop-blur-[2px] px-6 animate-rank-backdrop"
      onClick={onDone}
      role="dialog"
      aria-label="Has subido de rango"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-surface-elevated/95 px-8 py-7 shadow-lg shadow-black/10 animate-rank-pop">
        <img
          src={rankIconSrc(rankIndex)}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 image-pixelated drop-shadow-sm"
        />
        <p className="font-display text-lg font-semibold tracking-tight text-foreground">
          Has subido de rango
        </p>
        <p className="text-xs text-muted">Rango {rankIndex}</p>
      </div>
    </div>
  );
}
