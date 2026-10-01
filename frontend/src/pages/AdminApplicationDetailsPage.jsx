import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminDocumentTable from "../components/admin/AdminDocumentTable.jsx";
import ApplicationStatusTimeline from "../components/ApplicationStatusTimeline.jsx";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

const transitions = {
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: [
    "DOCUMENT_VERIFICATION",
    "APPROVED",
    "REJECTED",
    "ADDITIONAL_INFORMATION_REQUIRED",
  ],
  DOCUMENT_VERIFICATION: [
    "APPROVED",
    "REJECTED",
    "ADDITIONAL_INFORMATION_REQUIRED",
  ],
  ADDITIONAL_INFORMATION_REQUIRED: [
    "UNDER_REVIEW",
    "DOCUMENT_VERIFICATION",
    "APPROVED",
    "REJECTED",
  ],
  APPROVED: [],
  REJECTED: [],
};

const statusLabels = {
  UNDER_REVIEW: "Under review",
  DOCUMENT_VERIFICATION: "Document verification",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ADDITIONAL_INFORMATION_REQUIRED: "Additional information required",
};

function DetailSection({ title, entries }) {
  return (
    <section className="border-t border-gov-border pt-4">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-xs font-semibold uppercase text-gov-muted">
              {label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap wrap-break-word text-sm">
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

export default function AdminApplicationDetailsPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    authApi
      .adminApplication(applicationId)
      .then((result) => {
        if (!active) return;
        setApplication(result);
        setNextStatus(transitions[result.status]?.[0] ?? "");
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
  }, [applicationId]);

  async function updateStatus(event) {
    event.preventDefault();
    if (!nextStatus) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await authApi.adminUpdateApplicationStatus(
        applicationId,
        nextStatus,
        remarks,
      );
      const updated = await authApi.adminApplication(applicationId);
      setApplication(updated);
      setNextStatus(transitions[updated.status]?.[0] ?? "");
      setRemarks("");
      setMessage("Status updated and added to the history.");
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Administration", href: "/admin" },
          { label: "Applications", href: "/admin/applications" },
          { label: "Application review" },
        ]}
        description="Review the application, documents, and public status remarks."
        eyebrow="Application details"
        title={application?.applicationNumber ?? "Application review"}
        actions={
          <Button to="/admin/applications" variant="secondary">
            Back to queue
          </Button>
        }
      />
      {loading && <LoadingState label="Loading application details…" />}
      {error && (
        <ErrorState description={error} title="Application unavailable" />
      )}
      {message && (
        <Alert title="Status updated" tone="success">
          {message}
        </Alert>
      )}
      {application && (
        <div className="space-y-6">
          <Card className="max-w-none space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-gov-green">
                  {application.applicationNumber}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">
                  {application.student.fullName}
                </h2>
              </div>
              <p className="text-sm text-gov-muted">
                Submitted {formatDate(application.submittedAt)}
                <br />
                Updated {formatDate(application.updatedAt)}
              </p>
            </div>
            <DetailSection
              title="Student"
              entries={[
                ["Account email", application.student.email],
                ["Student number", application.student.studentNumber],
                ["Date of birth", application.student.dateOfBirth],
                ["Gender", application.student.gender],
                ["Mobile", application.student.mobileNumber],
                ["Address", application.student.address],
              ]}
            />
            <DetailSection
              title="Academic information"
              entries={[
                ["College", application.academic.college],
                ["Course", application.academic.course],
                ["Branch", application.academic.branch],
                ["Year", application.academic.year],
                ["Roll number", application.academic.rollNumber],
                ["Admission year", application.admissionYear],
              ]}
            />
            <DetailSection
              title="Guardian"
              entries={[
                ["Name", application.guardian.name],
                ["Relationship", application.guardian.relationship],
                ["Mobile", application.guardian.mobile],
                ["Address", application.guardian.address],
                ["Additional information", application.guardian.remarks],
              ]}
            />
            <DetailSection
              title="Hostel preference"
              entries={[
                ["Hostel", application.hostel],
                ["Additional information", application.hostelRemarks],
              ]}
            />
          </Card>

          <Card className="max-w-none space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Review decision
              </h2>
              <p className="mt-1 text-sm text-gov-muted">
                Each change is recorded in the application history. Remarks
                entered here are visible to the student.
              </p>
            </div>
            {transitions[application.status]?.length > 0 ? (
              <form
                className="grid gap-4 sm:grid-cols-[minmax(14rem,0.6fr)_1fr_auto] sm:items-end"
                onSubmit={updateStatus}
              >
                <div className="space-y-1.5">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="next-status"
                  >
                    New status
                  </label>
                  <select
                    className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 text-sm"
                    id="next-status"
                    onChange={(event) => setNextStatus(event.target.value)}
                    required
                    value={nextStatus}
                  >
                    {transitions[application.status].map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="student-remarks"
                  >
                    Student-facing remarks
                  </label>
                  <textarea
                    className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm"
                    id="student-remarks"
                    maxLength={1000}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Optional update for the student"
                    value={remarks}
                  />
                </div>
                <Button disabled={saving || !nextStatus} type="submit">
                  {saving ? "Saving…" : "Update status"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-gov-muted">
                This application is in a final status and cannot be changed.
              </p>
            )}
            {error && (
              <p className="text-sm text-rose-800" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-emerald-800" role="status">
                {message}
              </p>
            )}
            <ApplicationStatusTimeline status={application} />
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Documents</h2>
              <p className="mt-1 text-sm text-gov-muted">
                Downloads are authorized and streamed through the protected API.
              </p>
            </div>
            <AdminDocumentTable rows={application.documents} />
          </section>
        </div>
      )}
      <Link
        className="inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
        to="/admin/applications"
      >
        Return to applications
      </Link>
    </div>
  );
}
