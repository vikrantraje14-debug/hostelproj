import { cloneElement, isValidElement } from "react";
import { cn } from "../../utils/cn.js";

const controlClassName =
  "min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-base text-gov-ink placeholder:text-slate-500 focus:border-gov-green focus:outline-2 focus:outline-offset-1 focus:outline-gov-green disabled:bg-slate-100";

export function FormField({
  children,
  className,
  error,
  hint,
  id,
  label,
  required = false,
}) {
  const describedBy = [
    children?.props?.["aria-describedby"],
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        required: required || children.props.required,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-semibold text-gov-ink" htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-rose-700">
            *
          </span>
        )}
      </label>
      {control}
      {hint && (
        <p className="text-sm leading-5 text-gov-muted" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p
          className="text-sm font-medium text-rose-800"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn(controlClassName, className)} {...props} />;
}

export function Select({ children, className, ...props }) {
  return (
    <select className={cn(controlClassName, className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 4, ...props }) {
  return (
    <textarea
      className={cn("min-h-28", controlClassName, className)}
      rows={rows}
      {...props}
    />
  );
}
