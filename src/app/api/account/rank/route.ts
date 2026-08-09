import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getRankSnapshot,
  syncRankProgressFromHistory,
} from "@/lib/rank-progress";
import {
  POINTS_OPTIMAL_DAY,
  POINTS_PERFECT_WEEK,
  RANK_THRESHOLDS,
  rankIconSrc,
} from "@/lib/ranks";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sync = searchParams.get("sync") === "1";

  const snap = sync
    ? await syncRankProgressFromHistory(user.id)
    : await getRankSnapshot(user.id);

  return NextResponse.json({
    points: snap.points,
    rankIndex: snap.rankIndex,
    nextRankIndex: snap.nextRankIndex,
    pointsToNext: snap.pointsToNext,
    nextThreshold: snap.nextThreshold,
    iconSrc: rankIconSrc(snap.rankIndex),
    rules: {
      optimalDay: POINTS_OPTIMAL_DAY,
      perfectWeek: POINTS_PERFECT_WEEK,
      thresholds: RANK_THRESHOLDS,
    },
  });
}
