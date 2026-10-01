import { Link } from "react-router-dom";
import { cn } from "../../utils/cn.js";

const variants = {
  primary: "border-gov-green bg-gov-green text-white hover:bg-gov-green-dark",
  secondary: "border-gov-border bg-white text-gov-ink hover:bg-gov-page",
  quiet: "border-transparent text-gov-green hover:bg-gov-green/10",
};

export default function Button({
  children,
  className,
  disabled = false,
  href,
  to,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}) {
  const Component = to ? Link : href ? "a" : "button";

  return (
    <Component
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-sm border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gov-gold disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" ? "min-h-9 px-3 text-xs" : "",
        variants[variant] ?? variants.primary,
        className,
      )}
      {...(to ? { to } : href ? { href } : { type, disabled })}
      {...props}
    >
      {children}
    </Component>
  );
}
