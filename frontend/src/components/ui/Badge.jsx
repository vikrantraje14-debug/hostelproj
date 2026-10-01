import { cn } from "../../utils/cn.js";

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-900",
  success: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-950",
  danger: "bg-rose-100 text-rose-900",
};

export default function Badge({ children, className, tone = "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-sm px-2 py-1 text-xs font-semibold",
        tones[tone] ?? tones.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
