import { Link } from "react-router-dom";

export default function GovernmentBranding() {
  return (
    <Link
      aria-label="Government Hostel Admission Portal home"
      className="flex min-w-0 items-center gap-3 text-gov-ink no-underline"
      to="/"
    >
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-gov-green text-lg font-bold text-gov-green"
      >
        H
      </span>
      <span className="min-w-0">
        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-gov-muted">
          Student welfare services
        </span>
        <span className="mt-1 block font-display text-base font-semibold leading-tight sm:text-lg">
          Government Hostel Admission Portal
        </span>
      </span>
    </Link>
  );
}
