import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-900">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link className="font-medium text-emerald-800 underline" to="/">
        Return to the portal
      </Link>
    </main>
  );
}
