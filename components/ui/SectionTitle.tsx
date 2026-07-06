import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold tracking-[0.2em] text-radar-accent uppercase">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-radar-white sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-2xl text-balance text-base text-radar-muted sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}
