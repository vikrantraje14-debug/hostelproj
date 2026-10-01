import { cn } from "../../utils/cn.js";
import Breadcrumbs from "./Breadcrumbs.jsx";

export default function PageHeader({
  actions,
  breadcrumbs,
  className,
  description,
  eyebrow,
  title,
}) {
  return (
    <header className={cn("border-b border-gov-border pb-6", className)}>
      {breadcrumbs?.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gov-green">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-semibold leading-tight text-gov-ink sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl leading-7 text-gov-muted">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
        )}
      </div>
    </header>
  );
}
