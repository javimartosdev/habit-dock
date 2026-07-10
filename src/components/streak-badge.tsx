export function StreakBadge({
  current,
  longest,
}: {
  current: number;
  longest: number;
}) {
  return (
    <div className="flex gap-4 text-sm">
      <div>
        <span className="text-muted">Racha actual</span>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {current}
        </p>
      </div>
      <div>
        <span className="text-muted">Mejor racha</span>
        <p className="text-2xl font-semibold tabular-nums text-foreground/70">
          {longest}
        </p>
      </div>
    </div>
  );
}
