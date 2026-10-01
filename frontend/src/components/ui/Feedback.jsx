import Button from "./Button.jsx";

export function LoadingState({ label = "Loading" }) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-3 py-4 text-sm text-gov-muted"
      role="status"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-gov-border border-t-gov-green motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title = "Nothing to show yet",
}) {
  return (
    <div className="border border-dashed border-gov-border bg-white px-5 py-8 text-center">
      <h2 className="font-semibold text-gov-ink">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gov-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  description = "Please try again later.",
  onRetry,
  title = "We could not load this information",
}) {
  return (
    <div
      className="border-l-4 border-rose-700 bg-rose-50 px-4 py-4"
      role="alert"
    >
      <h2 className="font-semibold text-rose-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-rose-900">{description}</p>
      {onRetry && (
        <Button className="mt-3" onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  );
}

export function SuccessMessage({ children, title = "Completed" }) {
  return (
    <div
      className="border-l-4 border-emerald-700 bg-emerald-50 px-4 py-3 text-emerald-950"
      role="status"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{children}</p>
    </div>
  );
}
