import { cn } from "@repo/shared";

type ProgressRingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
};

function ProgressRing({ value, size = 64, strokeWidth = 6, label, className }: ProgressRingProps) {
  const percent = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const text = label ?? Math.round(percent) + "%";
  const center = size / 2;

  return (
    <div
      role="img"
      aria-label={text}
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox={"0 0 " + size + " " + size}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums text-foreground">
        {text}
      </span>
    </div>
  );
}

export { ProgressRing, type ProgressRingProps };
