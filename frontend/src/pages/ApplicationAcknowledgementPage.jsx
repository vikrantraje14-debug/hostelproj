import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { authApi } from "../services/authApi.js";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

export default function ApplicationAcknowledgementPage() {
  const { applicationId } = useParams();
  const location = useLocation();
  const [application, setApplication] = useState(
    location.state?.application ?? null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!location.state?.application);

  useEffect(() => {
    if (application) return undefined;
    let active = true;
    authApi
      .studentApplication(applicationId)
      .then((result) => {
        if (active) setApplication(result);
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
  }, [application, applicationId]);

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "My applications", href: "/student/applications" },
          { label: "Acknowledgement" },
        ]}
        description="Keep this reference number for future status checks."
        eyebrow="Submission confirmation"
        title="Application acknowledgement"
      />
      {loading && <LoadingState label="Loading acknowledgement…" />}
      {error && (
        <ErrorState description={error} title="Acknowledgement unavailable" />
      )}
      {application && (
        <div className="max-w-3xl space-y-5">
          <Alert title="Submission received" tone="success">
            This acknowledgement confirms receipt only; it is not an admission
            decision.
          </Alert>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                Application reference
              </h2>
              <Badge tone="info">{application.status}</Badge>
            </div>
            <p className="mt-3 break-all font-mono text-lg font-semibold text-gov-green">
              {application.referenceNumber}
            </p>
            <dl className="mt-5 grid gap-4 border-t border-gov-border pt-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gov-muted">Submission date</dt>
                <dd className="mt-1 font-semibold">
                  {application.submittedAt
                    ? new Date(application.submittedAt).toLocaleString()
                    : "Not available"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">Admission year</dt>
                <dd className="mt-1 font-semibold">
                  {application.admissionYear}
                </dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-semibold">
              Application summary
            </h2>
            <dl className="mt-4 grid gap-4 border-t border-gov-border pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gov-muted">Student</dt>
                <dd className="mt-1 font-semibold">
                  {application.summary?.fullName}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">College</dt>
                <dd className="mt-1 font-semibold">
                  {application.summary?.college}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">Course</dt>
                <dd className="mt-1 font-semibold">
                  {application.summary?.course}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">Hostel preference</dt>
                <dd className="mt-1 font-semibold">
                  {application.summary?.hostelPreference ?? "Not specified"}
                </dd>
              </div>
            </dl>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button to="/application-status">Check application status</Button>
            <Link
              className="inline-flex min-h-11 items-center px-2 font-semibold text-gov-green underline underline-offset-4"
              to="/student/applications"
            >
              My applications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
