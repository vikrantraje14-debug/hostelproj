import { cn } from "../../utils/cn.js";

const tones = {
  info: "border-sky-700 bg-sky-50 text-sky-950",
  success: "border-emerald-700 bg-emerald-50 text-emerald-950",
  warning: "border-amber-700 bg-amber-50 text-amber-950",
  danger: "border-rose-700 bg-rose-50 text-rose-950",
};

export default function Alert({ children, className, title, tone = "info" }) {
  return (
    <div
      className={cn(
        "border-l-4 px-4 py-3",
        tones[tone] ?? tones.info,
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title && <h2 className="font-semibold">{title}</h2>}
      <div className={cn(title && "mt-1", "text-sm leading-6")}>{children}</div>
    </div>
  );
}
