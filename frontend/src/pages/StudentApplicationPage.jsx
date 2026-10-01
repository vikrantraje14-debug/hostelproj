import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import ApplicationStatusTimeline from "../components/ApplicationStatusTimeline.jsx";
import { authApi } from "../services/authApi.js";

export default function StudentApplicationPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [documentsError, setDocumentsError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  useEffect(() => {
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
    authApi
      .applicationStatus(applicationId)
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((loadError) => {
        if (active) setStatusError(loadError.message);
      });
    authApi
      .applicationDocuments(applicationId)
      .then((result) => {
        if (active) setDocuments(result.documents);
      })
      .catch((loadError) => {
        if (active) setDocumentsError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [applicationId]);

  async function downloadDocument(documentInfo) {
    setDownloadingId(documentInfo.id);
    setDocumentsError("");
    try {
      const blob = await authApi.downloadDocument(
        applicationId,
        documentInfo.id,
      );
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = documentInfo.originalFilename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setDocumentsError(downloadError.message);
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "My applications", href: "/student/applications" },
          { label: "Application details" },
        ]}
        description="Application details are retrieved using your authenticated student identity."
        eyebrow="Protected student area"
        title="Application details"
      />
      {loading && <LoadingState label="Loading application…" />}
      {error && (
        <ErrorState description={error} title="Application unavailable" />
      )}
      {application && (
        <Card className="max-w-3xl">
          <h2 className="font-display text-xl font-semibold">
            Application {application.referenceNumber ?? application.id}
          </h2>
          <dl className="mt-4 grid gap-4 border-t border-gov-border pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gov-muted">Status</dt>
              <dd className="mt-1 font-semibold">{application.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-gov-muted">Admission year</dt>
              <dd className="mt-1 font-semibold">
                {application.admissionYear}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gov-muted">Submitted</dt>
              <dd className="mt-1 font-semibold">
                {application.submittedAt
                  ? new Date(application.submittedAt).toLocaleString()
                  : "Not submitted"}
              </dd>
            </div>
          </dl>
          <Alert
            className="mt-5"
            title="Private application record"
            tone="info"
          >
            The API checks record ownership on every request.
          </Alert>
          {statusError ? (
            <p className="mt-5 text-sm text-rose-800" role="alert">
              Status information is unavailable: {statusError}
            </p>
          ) : (
            <ApplicationStatusTimeline status={status} />
          )}
          <section className="mt-6 border-t border-gov-border pt-5">
            <h3 className="font-display text-lg font-semibold">Documents</h3>
            {documentsError && (
              <p className="mt-2 text-sm text-rose-800" role="alert">
                {documentsError}
              </p>
            )}
            {documents.length === 0 ? (
              <p className="mt-2 text-sm text-gov-muted">
                No documents have been uploaded.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-gov-border border-y border-gov-border">
                {documents.map((documentInfo) => (
                  <li
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    key={documentInfo.id}
                  >
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium">
                        {documentInfo.originalFilename}
                      </p>
                      <p className="text-sm text-gov-muted">
                        {documentInfo.documentType} · {documentInfo.contentType}
                      </p>
                    </div>
                    <Button
                      disabled={downloadingId === documentInfo.id}
                      onClick={() => void downloadDocument(documentInfo)}
                      type="button"
                      variant="secondary"
                    >
                      {downloadingId === documentInfo.id
                        ? "Downloading…"
                        : "Download"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Card>
      )}
      <Link
        className="inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
        to="/student/applications"
      >
        Back to my applications
      </Link>
    </div>
  );
}
