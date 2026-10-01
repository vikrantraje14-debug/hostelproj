import GovernmentBranding from "./GovernmentBranding.jsx";
import {
  MobileNavigation,
  Navigation,
  StudentQuickLinks,
} from "./Navigation.jsx";

export default function SiteHeader() {
  return (
    <header className="relative z-10 bg-white">
      <div className="bg-gov-ink text-white">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-3 px-4 text-xs sm:px-6 lg:px-8">
          <span>Government services portal</span>
          <span className="hidden text-white/80 sm:inline">
            Public information and student services
          </span>
        </div>
      </div>
      <div className="mx-auto flex min-h-24 max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <GovernmentBranding />
      </div>
      <div className="border-y border-gov-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Navigation />
          <MobileNavigation />
          <StudentQuickLinks />
        </div>
      </div>
    </header>
  );
}
