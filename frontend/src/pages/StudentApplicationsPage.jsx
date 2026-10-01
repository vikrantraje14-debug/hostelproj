import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

export default function StudentApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    authApi
      .studentApplications()
      .then((result) => {
        if (active) setApplications(result);
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

  async function searchByReference(event) {
    event.preventDefault();
    setError("");
    setSearching(true);
    try {
      const application = await authApi.searchApplication(referenceNumber);
      navigate(`/student/applications/${application.id}`);
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Student account", href: "/student" },
          { label: "My applications" },
        ]}
        description="Only applications associated with your signed-in student account are returned."
        eyebrow="Protected student area"
        title="My applications"
      />
      <Alert title="Private account information" tone="info">
        Sign in to verify your student identity. Search returns only
        applications belonging to your account; changing a reference or URL
        cannot grant access to another student’s record.
      </Alert>
      <form
        className="flex flex-col gap-3 border-y border-gov-border py-5 sm:flex-row sm:items-end"
        onSubmit={searchByReference}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            className="block text-sm font-semibold text-gov-ink"
            htmlFor="application-reference"
          >
            Application reference number
          </label>
          <input
            autoComplete="off"
            className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-base text-gov-ink"
            id="application-reference"
            onChange={(event) => setReferenceNumber(event.target.value)}
            required
            value={referenceNumber}
          />
        </div>
        <button
          className="min-h-11 rounded-sm bg-gov-green px-5 font-semibold text-white disabled:opacity-60"
          disabled={searching || !referenceNumber.trim()}
          type="submit"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {loading && <LoadingState label="Loading your applications…" />}
      {error && (
        <ErrorState description={error} title="Applications unavailable" />
      )}
      {!loading && !error && applications.length === 0 && (
        <EmptyState
          description="No application records are associated with your account."
          title="No applications found"
        />
      )}
      {!loading && !error && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((application) => (
            <Card
              as="article"
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              key={application.id}
            >
              <div className="min-w-0">
                <h2 className="font-semibold">
                  {application.reference_number ??
                    application.referenceNumber ??
                    `Application ${application.id}`}
                </h2>
                <p className="mt-1 text-sm text-gov-muted">
                  Admission year: {application.admission_year}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="info">{application.status}</Badge>
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
                  to={`/student/applications/${application.id}`}
                >
                  View details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
