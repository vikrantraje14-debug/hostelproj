import { Link } from "react-router-dom";

const footerLinks = [
  [
    { to: "/about-hostel", label: "About the hostel" },
    { to: "/hostel-details", label: "Hostel details" },
    { to: "/facilities", label: "Facilities" },
    { to: "/eligibility", label: "Eligibility" },
    { to: "/rules-regulations", label: "Rules and regulations" },
  ],
  [
    { to: "/fee-structure", label: "Fee structure" },
    { to: "/required-documents", label: "Required documents" },
    { to: "/important-dates", label: "Important dates" },
    { to: "/notices", label: "Notices" },
    { to: "/faqs", label: "FAQs" },
  ],
  [
    { to: "/contact", label: "Contact" },
    { to: "/apply-online", label: "Apply online" },
    { to: "/application-status", label: "Application status" },
    { to: "/student-login", label: "Student login" },
    { to: "/student-registration", label: "Student registration" },
    { to: "/admin/login", label: "Admin sign in" },
  ],
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t-4 border-gov-gold bg-gov-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <p className="font-display text-lg font-semibold">
            Government Hostel Admission Portal
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/75">
            Public information for students seeking government hostel
            accommodation.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="grid gap-6 sm:grid-cols-3"
        >
          {footerLinks.map((group, index) => (
            <ul className="space-y-2 text-sm text-white/80" key={index}>
              {group.map((link) => (
                <li key={link.to}>
                  <Link
                    className="underline underline-offset-4 hover:text-white"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </nav>
        <div className="border-t border-white/20 pt-5 lg:col-span-2 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-5">
          <div>
            <h2 className="text-sm font-semibold">Need assistance?</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Official office contact details have not been supplied for this
              demo.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/20">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/70 sm:px-6 lg:px-8">
          Government Hostel Admission Portal · Public information service
        </p>
      </div>
    </footer>
  );
}
