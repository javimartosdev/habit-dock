"use client";

import Link from "next/link";
import { useRank } from "@/components/rank-provider";
import { RankIcon } from "@/components/rank-icon";

export function RankBadge() {
  const { rank } = useRank();
  if (!rank) return null;

  const title =
    rank.pointsToNext != null
      ? `Rango ${rank.rankIndex} · ${rank.points} pts · ${rank.pointsToNext} para el siguiente`
      : `Rango ${rank.rankIndex} · ${rank.points} pts · máximo`;

  return (
    <Link
      href="/ranks"
      title={title}
      aria-label={title}
      className="flex items-center rounded-lg px-1 py-0.5 hover:bg-surface-hover transition-colors"
    >
      <RankIcon src={rank.iconSrc} size="sm" />
    </Link>
  );
}
