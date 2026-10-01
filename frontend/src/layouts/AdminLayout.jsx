import { NavLink, Outlet } from "react-router-dom";
import LogoutButton from "../components/site/LogoutButton.jsx";

const adminLinks = [
  { label: "Overview", to: "/admin", end: true },
  { label: "Applications", to: "/admin/applications" },
  { label: "Students", to: "/admin/students" },
  { label: "Documents", to: "/admin/documents" },
  { label: "Hostels", to: "/admin/content/hostels" },
  { label: "Facilities", to: "/admin/content/facilities" },
  { label: "Fees", to: "/admin/content/fees" },
  { label: "Notices", to: "/admin/content/notices" },
  { label: "Rules", to: "/admin/content/rules" },
  { label: "Important dates", to: "/admin/content/important-dates" },
  { label: "Settings", to: "/admin/settings" },
];

export default function AdminLayout() {
  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-gov-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-gov-green">
            Administration
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-gov-ink">
            Admissions workspace
          </p>
        </div>
        <LogoutButton />
      </header>
      <nav
        aria-label="Administration"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-gov-border px-1"
      >
        {adminLinks.map((link) => (
          <NavLink
            className={({ isActive }) =>
              `inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold ${isActive ? "border-gov-green text-gov-green" : "border-transparent text-gov-muted hover:text-gov-ink"}`
            }
            end={link.end}
            key={link.to}
            to={link.to}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
