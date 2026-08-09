/** Points for a fully completed day (all loggable habits done). */
export const POINTS_OPTIMAL_DAY = 100;

/** Bonus when the week becomes perfect (all habit quotas met). */
export const POINTS_PERFECT_WEEK = 250;

/**
 * Cumulative points required to unlock each rank (0..25).
 * Rank 1 (wood hammer) unlocks at the first optimal day.
 * Later ranks climb steeply so the top stays a long-term goal.
 */
export const RANK_THRESHOLDS: readonly number[] = [
  0, // 0 — chick
  100, // 1 — wood hammer
  300, // 2
  600, // 3
  1100, // 4
  1800, // 5
  2700, // 6
  3800, // 7
  5200, // 8
  7000, // 9
  9200, // 10
  12_000, // 11
  15_500, // 12
  20_000, // 13
  26_000, // 14
  33_500, // 15
  43_000, // 16
  55_000, // 17
  70_000, // 18
  90_000, // 19
  115_000, // 20
  145_000, // 21
  185_000, // 22
  235_000, // 23
  300_000, // 24
  380_000, // 25 — top
] as const;

export const MAX_RANK = RANK_THRESHOLDS.length - 1;

export function rankIndexFromPoints(points: number): number {
  let rank = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (points >= RANK_THRESHOLDS[i]) rank = i;
    else break;
  }
  return rank;
}

export function pointsToNextRank(points: number): {
  rankIndex: number;
  nextRankIndex: number | null;
  pointsToNext: number | null;
  nextThreshold: number | null;
} {
  const rankIndex = rankIndexFromPoints(points);
  if (rankIndex >= MAX_RANK) {
    return {
      rankIndex,
      nextRankIndex: null,
      pointsToNext: null,
      nextThreshold: null,
    };
  }
  const nextRankIndex = rankIndex + 1;
  const nextThreshold = RANK_THRESHOLDS[nextRankIndex];
  return {
    rankIndex,
    nextRankIndex,
    pointsToNext: Math.max(0, nextThreshold - points),
    nextThreshold,
  };
}

export function rankIconSrc(rankIndex: number): string {
  const safe = Math.min(MAX_RANK, Math.max(0, rankIndex));
  return `/ranks/${safe}.png`;
}

export function dayAwardKey(dateKey: string): string {
  return `day:${dateKey}`;
}

export function weekAwardKey(weekStartKey: string): string {
  return `week:${weekStartKey}`;
}
