export default function ApplicationStepIndicator({ currentStep, steps }) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div aria-label="Application progress" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 sm:hidden">
        <p className="text-sm font-semibold text-gov-ink">
          Step {currentStep + 1} of {steps.length}
        </p>
        <p className="text-sm text-gov-muted">{steps[currentStep].title}</p>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li
              aria-current={isCurrent ? "step" : undefined}
              className="min-w-0"
              key={step.title}
            >
              <div
                className={`flex min-h-10 items-center justify-center gap-2 border-t-2 px-1 py-2 sm:justify-start sm:px-2 ${
                  isCurrent
                    ? "border-gov-green text-gov-green"
                    : isComplete
                      ? "border-gov-green/50 text-gov-ink"
                      : "border-gov-border text-gov-muted"
                }`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                  {isComplete ? "✓" : index + 1}
                </span>
                <span className="hidden truncate text-xs font-semibold md:block">
                  {step.shortTitle}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <div
        aria-label={`Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].title}`}
        aria-valuemax={steps.length}
        aria-valuemin={1}
        aria-valuenow={currentStep + 1}
        className="h-1.5 overflow-hidden rounded-full bg-gov-border"
        role="progressbar"
      >
        <div
          className="h-full bg-gov-green transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}