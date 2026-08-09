"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { RankLevelUp } from "@/components/rank-level-up";
import { rankIconSrc } from "@/lib/ranks";

export type RankState = {
  points: number;
  rankIndex: number;
  nextRankIndex: number | null;
  pointsToNext: number | null;
  iconSrc: string;
};

type RankUpdate = {
  points: number;
  rankIndex: number;
  leveledUp?: boolean;
  nextRankIndex?: number | null;
  pointsToNext?: number | null;
  iconSrc?: string;
};

type RankContextValue = {
  rank: RankState | null;
  applyRankUpdate: (update: RankUpdate) => void;
  refresh: (sync?: boolean) => Promise<void>;
};

const RankContext = createContext<RankContextValue>({
  rank: null,
  applyRankUpdate: () => {},
  refresh: async () => {},
});

export function RankProvider({ children }: { children: React.ReactNode }) {
  const [rank, setRank] = useState<RankState | null>(null);
  const [levelUpRank, setLevelUpRank] = useState<number | null>(null);

  const refresh = useCallback(async (sync = false) => {
    const res = await fetch(`/api/account/rank${sync ? "?sync=1" : ""}`);
    if (!res.ok) return;
    const data = (await res.json()) as RankState;
    setRank({
      points: data.points,
      rankIndex: data.rankIndex,
      nextRankIndex: data.nextRankIndex,
      pointsToNext: data.pointsToNext,
      iconSrc: data.iconSrc ?? rankIconSrc(data.rankIndex),
    });
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  const applyRankUpdate = useCallback((update: RankUpdate) => {
    setRank({
      points: update.points,
      rankIndex: update.rankIndex,
      nextRankIndex: update.nextRankIndex ?? null,
      pointsToNext: update.pointsToNext ?? null,
      iconSrc: update.iconSrc ?? rankIconSrc(update.rankIndex),
    });
    if (update.leveledUp) {
      setLevelUpRank(update.rankIndex);
    }
  }, []);

  return (
    <RankContext.Provider value={{ rank, applyRankUpdate, refresh }}>
      {children}
      {levelUpRank !== null && (
        <RankLevelUp
          rankIndex={levelUpRank}
          onDone={() => setLevelUpRank(null)}
        />
      )}
    </RankContext.Provider>
  );
}

export function useRank() {
  return useContext(RankContext);
}
