import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";
import LogoutButton from "./LogoutButton.jsx";

const links = [
  { to: "/", label: "Home" },
  { to: "/about-hostel", label: "About" },
  { to: "/hostel-details", label: "Hostels" },
  { to: "/eligibility", label: "Admissions" },
  { to: "/notices", label: "Notices" },
  { to: "/contact", label: "Contact" },
];

function NavigationLinks({ onNavigate }) {
  return links.map((link) => (
    <NavLink
      className={({ isActive }) =>
        `block border-b border-gov-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-gov-page hover:text-gov-green md:border-0 md:px-3 md:py-3 ${isActive ? "text-gov-green" : "text-gov-ink"}`
      }
      end={link.to === "/"}
      key={link.to}
      onClick={onNavigate}
      to={link.to}
    >
      {link.label}
    </NavLink>
  ));
}

export function Navigation() {
  return (
    <nav aria-label="Primary navigation" className="hidden md:block">
      <div className="flex items-center gap-1">
        <NavigationLinks />
      </div>
    </nav>
  );
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const dashboardPath = user?.role === "ADMIN" ? "/admin" : "/student";

  return (
    <div className="flex items-center gap-2 md:hidden">
      <Link
        className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-gov-green underline underline-offset-4"
        to={user ? dashboardPath : "/student-login"}
      >
        {user ? "My account" : "Student sign in"}
      </Link>
      <button
        aria-controls="mobile-primary-navigation"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="inline-flex min-h-11 items-center rounded-sm border border-gov-border bg-white px-4 text-sm font-semibold text-gov-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gov-gold"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "Close menu" : "Menu"}
      </button>
      {open && (
        <nav
          aria-label="Mobile primary navigation"
          className="absolute inset-x-0 z-20 border-y border-gov-border bg-white shadow-md"
          id="mobile-primary-navigation"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <NavigationLinks onNavigate={() => setOpen(false)} />
            <div className="grid gap-2 py-3">
              <Link
                className="py-2 text-sm font-semibold text-gov-green underline underline-offset-4"
                onClick={() => setOpen(false)}
                to="/apply-online"
              >
                Apply online
              </Link>
              <Link
                className="py-2 text-sm font-semibold text-gov-green underline underline-offset-4"
                onClick={() => setOpen(false)}
                to="/application-status"
              >
                Check application status
              </Link>
              {!user && (
                <Link
                  className="py-2 text-sm font-semibold text-gov-green underline underline-offset-4"
                  onClick={() => setOpen(false)}
                  to="/admin/login"
                >
                  Admin sign in
                </Link>
              )}
              {user && <LogoutButton />}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

export function StudentQuickLinks() {
  const { user } = useAuth();
  const dashboardPath = user?.role === "ADMIN" ? "/admin" : "/student";

  return (
    <div className="hidden items-center gap-3 md:flex">
      {user ? (
        <>
          <Link
            className="min-h-11 px-2 py-3 text-sm font-semibold text-gov-green underline underline-offset-4"
            to={dashboardPath}
          >
            {user.role === "ADMIN" ? "Admin dashboard" : "My account"}
          </Link>
          <LogoutButton />
        </>
      ) : (
        <>
          <Link
            className="min-h-11 px-2 py-3 text-sm font-semibold text-gov-green underline underline-offset-4"
            to="/student-login"
          >
            Student sign in
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-sm border border-gov-green bg-gov-green px-4 text-sm font-semibold text-white hover:bg-gov-green-dark"
            to="/apply-online"
          >
            Apply online
          </Link>
        </>
      )}
    </div>
  );
}
