import { useEffect, useState } from "react";
import AdminApplicationTable from "../components/admin/AdminApplicationTable.jsx";
import AdminStatGrid from "../components/admin/AdminStatGrid.jsx";
import Button from "../components/ui/Button.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      authApi.adminDashboardStats(),
      authApi.adminApplications({ page: 1, pageSize: 6 }),
    ])
      .then(([nextStats, applicationResult]) => {
        if (!active) return;
        setStats(nextStats);
        setApplications(applicationResult.applications);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-7">
      <PageHeader
        description="Monitor admissions activity and move directly into the review queue."
        eyebrow="Operations overview"
        title="Admin dashboard"
        actions={<Button to="/admin/applications">Open applications</Button>}
      />
      {loading && <LoadingState label="Loading dashboard data…" />}
      {error && (
        <ErrorState description={error} title="Dashboard unavailable" />
      )}
      {!loading && !error && (
        <>
          <AdminStatGrid stats={stats} />
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-gov-green">
                  Latest submissions
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  Recent applications
                </h2>
              </div>
              <Button to="/admin/applications" variant="secondary">
                View all applications
              </Button>
            </div>
            <AdminApplicationTable
              rows={applications}
              sortBy="submissionDate"
              sortDirection="desc"
              sortable={false}
            />
          </section>
        </>
      )}
    </div>
  );
}
