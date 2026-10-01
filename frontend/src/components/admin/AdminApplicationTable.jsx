import { Link } from "react-router-dom";
import Badge from "../ui/Badge.jsx";
import Table from "../ui/Table.jsx";

const statusLabels = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  DOCUMENT_VERIFICATION: "Document verification",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ADDITIONAL_INFORMATION_REQUIRED: "Information required",
};

function statusTone(status) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "SUBMITTED" || status === "ADDITIONAL_INFORMATION_REQUIRED") {
    return "warning";
  }
  return "info";
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
}

export default function AdminApplicationTable({
  rows,
  onSort,
  sortBy,
  sortDirection,
  sortable = true,
}) {
  const sortHeading = (key, label) =>
    sortable ? (
      <button
        aria-label={`Sort by ${label}`}
        className="min-h-8 text-left font-bold hover:text-gov-green focus-visible:outline-2 focus-visible:outline-gov-gold"
        onClick={() => onSort(key)}
        type="button"
      >
        {label} {sortBy === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </button>
    ) : (
      label
    );

  const columns = [
    {
      key: "applicationNumber",
      heading: sortHeading("applicationNumber", "Application Number"),
      render: (row) => (
        <Link
          className="font-semibold text-gov-green underline underline-offset-4"
          to={`/admin/applications/${row.id}`}
        >
          {row.applicationNumber}
        </Link>
      ),
    },
    {
      key: "studentName",
      heading: sortHeading("studentName", "Student Name"),
    },
    { key: "college", heading: sortHeading("college", "College") },
    { key: "course", heading: sortHeading("course", "Course") },
    { key: "hostel", heading: sortHeading("hostel", "Hostel") },
    {
      key: "submissionDate",
      heading: sortHeading("submissionDate", "Submission Date"),
      render: (row) => formatDate(row.submissionDate),
    },
    {
      key: "status",
      heading: sortHeading("status", "Status"),
      render: (row) => (
        <Badge tone={statusTone(row.status)}>
          {statusLabels[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      heading: "Actions",
      render: (row) => (
        <Link
          className="inline-flex min-h-9 items-center font-semibold text-gov-green underline underline-offset-4"
          to={`/admin/applications/${row.id}`}
        >
          View / review
        </Link>
      ),
    },
  ];

  return (
    <Table
      caption="Applications for administrative review"
      columns={columns}
      emptyMessage="No applications match these filters."
      rows={rows}
    />
  );
}
