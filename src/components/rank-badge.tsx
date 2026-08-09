"use client";

import Link from "next/link";
import { useRank } from "@/components/rank-provider";

export function RankBadge() {
  const { rank } = useRank();
  if (!rank) return null;

  const title =
    rank.pointsToNext != null
      ? `Rango ${rank.rankIndex} · ${rank.points} pts · ${rank.pointsToNext} para el siguiente`
      : `Rango ${rank.rankIndex} · ${rank.points} pts · máximo`;

  return (
    <Link
      href="/settings#rangos"
      title={title}
      aria-label={title}
      className="flex items-center rounded-lg p-0.5 hover:bg-surface-hover transition-colors"
    >
      <img
        src={rank.iconSrc}
        alt=""
        width={22}
        height={22}
        className="h-[22px] w-[22px] image-pixelated"
      />
    </Link>
  );
}
