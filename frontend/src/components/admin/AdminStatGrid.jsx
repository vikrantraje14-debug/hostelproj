const statistics = [
  ["totalApplications", "Total applications", "border-gov-green"],
  ["pendingApplications", "Pending", "border-gov-gold"],
  ["underReview", "Under review", "border-sky-700"],
  ["approved", "Approved", "border-emerald-700"],
  ["rejected", "Rejected", "border-rose-700"],
  ["receivedToday", "Received today", "border-slate-600"],
];

export default function AdminStatGrid({ stats }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statistics.map(([key, label, border]) => (
        <div
          className={`border border-gov-border border-l-4 ${border} bg-white px-4 py-4`}
          key={key}
        >
          <dt className="text-sm font-medium text-gov-muted">{label}</dt>
          <dd className="mt-2 font-display text-3xl font-semibold tabular-nums text-gov-ink">
            {Number(stats?.[key] ?? 0).toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}
