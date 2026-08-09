import { cn } from "@/lib/utils";
import { rankIconSrc } from "@/lib/ranks";

/** Native art is 50×30 — keep the rectangular pixel aspect. */
export function RankIcon({
  rankIndex,
  src,
  size = "md",
  className,
  title,
}: {
  rankIndex?: number;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
}) {
  const dims = {
    sm: { w: 30, h: 18, className: "h-[18px] w-[30px]" },
    md: { w: 40, h: 24, className: "h-6 w-10" },
    lg: { w: 56, h: 34, className: "h-[34px] w-14" },
    xl: { w: 80, h: 48, className: "h-12 w-20" },
  }[size];

  const resolved =
    src ?? (rankIndex != null ? rankIconSrc(rankIndex) : rankIconSrc(0));

  return (
    <img
      src={resolved}
      alt=""
      title={title}
      width={dims.w}
      height={dims.h}
      className={cn(
        "image-pixelated object-contain shrink-0",
        dims.className,
        className,
      )}
    />
  );
}
