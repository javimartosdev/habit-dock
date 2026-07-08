import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandVariant = "header" | "auth" | "icon";

export function BrandLogo({
  variant = "auth",
  className,
}: {
  variant?: BrandVariant;
  className?: string;
}) {
  if (variant === "icon") {
    return (
      <Image
        src="/icons/icon.svg"
        alt="Habit Dock"
        width={32}
        height={32}
        className={cn("rounded-lg shrink-0", className)}
        priority
      />
    );
  }

  if (variant === "header") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <Image
          src="/icons/icon.svg"
          alt=""
          width={36}
          height={36}
          className="rounded-[10px] shrink-0 shadow-sm shadow-black/20"
          priority
          aria-hidden
        />
        <span className="text-[17px] font-semibold tracking-tight text-foreground leading-none">
          Habit Dock
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        className,
      )}
    >
      <Image
        src="/icons/icon.svg"
        alt=""
        width={72}
        height={72}
        className="rounded-2xl shadow-lg shadow-black/25"
        priority
        aria-hidden
      />
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        Habit Dock
      </span>
    </div>
  );
}
