import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-surface-elevated/85 backdrop-blur-sm shadow-sm shadow-black/5",
        className,
      )}
    >
      {children}
    </div>
  );
}
