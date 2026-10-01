import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import DemoNotice from "../components/site/DemoNotice.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import SiteHeader from "../components/site/SiteHeader.jsx";

export default function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-gov-page text-gov-ink">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader />
      <DemoNotice />
      <main
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        id="main-content"
      >
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
