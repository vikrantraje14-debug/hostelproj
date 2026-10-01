import { useId } from "react";
import { cn } from "../../utils/cn.js";

export function Card({ as: Component = "div", className, children, ...props }) {
  return (
    <Component
      className={cn(
        "rounded-sm border border-gov-border bg-white p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Section({
  children,
  className,
  description,
  eyebrow,
  id,
  title,
}) {
  const generatedId = useId();
  const titleId = id ? `${id}-title` : `section-${generatedId}`;

  return (
    <section
      aria-labelledby={titleId}
      className={cn("scroll-mt-6", className)}
      id={id}
    >
      {(eyebrow || title || description) && (
        <header className="mb-5 max-w-3xl">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gov-green">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2
              className="font-display text-2xl font-semibold text-gov-ink sm:text-3xl"
              id={titleId}
            >
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-2 leading-7 text-gov-muted">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
