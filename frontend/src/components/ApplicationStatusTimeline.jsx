const statusLabels = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  DOCUMENT_VERIFICATION: "Document verification",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ADDITIONAL_INFORMATION_REQUIRED: "Additional information required",
};

function formatTimestamp(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ApplicationStatusTimeline({ status }) {
  if (!status) return null;

  return (
    <section
      aria-labelledby="application-status-heading"
      className="mt-6 border-t border-gov-border pt-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-gov-green">
            Current status
          </p>
          <h3
            className="mt-1 font-display text-xl font-semibold text-gov-ink"
            id="application-status-heading"
          >
            {statusLabels[status.status] ?? status.status}
          </h3>
        </div>
        <dl className="grid gap-2 text-sm sm:text-right">
          <div>
            <dt className="text-gov-muted">Submitted</dt>
            <dd className="font-medium text-gov-ink">
              {formatTimestamp(status.submittedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-gov-muted">Last updated</dt>
            <dd className="font-medium text-gov-ink">
              {formatTimestamp(status.updatedAt)}
            </dd>
          </div>
        </dl>
      </div>

      {status.remarks && (
        <div className="mt-4 border-l-4 border-gov-gold bg-amber-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-gov-ink">Latest remark</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gov-ink">
            {status.remarks}
          </p>
        </div>
      )}

      <h4 className="mt-6 text-sm font-semibold text-gov-ink">
        Status history
      </h4>
      {status.history.length === 0 ? (
        <p className="mt-2 text-sm text-gov-muted">
          No status history is available.
        </p>
      ) : (
        <ol className="mt-3">
          {status.history.map((entry, index) => {
            const current = index === status.history.length - 1;
            return (
              <li
                className="relative flex gap-4 pb-6 last:pb-0"
                key={`${entry.timestamp}-${index}`}
              >
                <span
                  aria-hidden="true"
                  className={`relative mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${current ? "border-gov-green bg-gov-green" : "border-slate-400 bg-white"}`}
                >
                  {current && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                  {index < status.history.length - 1 && (
                    <span className="absolute left-1/2 top-4 h-full w-px -translate-x-1/2 bg-slate-300" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="font-semibold text-gov-ink">
                      {statusLabels[entry.status] ?? entry.status}
                      {current && (
                        <span className="ml-2 text-xs font-medium text-gov-green">
                          Current
                        </span>
                      )}
                    </p>
                    <time
                      className="text-sm text-gov-muted"
                      dateTime={entry.timestamp}
                    >
                      {formatTimestamp(entry.timestamp)}
                    </time>
                  </div>
                  {entry.remarks && (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gov-muted">
                      {entry.remarks}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
