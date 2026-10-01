import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../services/authApi.js";
import Button from "../ui/Button.jsx";
import Table from "../ui/Table.jsx";

function formatSize(byteSize) {
  return `${(byteSize / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

export default function AdminDocumentTable({ rows }) {
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");

  async function download(documentInfo) {
    setError("");
    setDownloadingId(documentInfo.id);
    try {
      const blob = await authApi.downloadDocument(
        documentInfo.applicationId,
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
      setError(downloadError.message);
    } finally {
      setDownloadingId("");
    }
  }

  const columns = [
    { key: "originalFilename", heading: "Document" },
    { key: "documentType", heading: "Category" },
    { key: "contentType", heading: "File type" },
    {
      key: "byteSize",
      heading: "Size",
      render: (row) => formatSize(row.byteSize),
    },
    {
      key: "applicationNumber",
      heading: "Application",
      render: (row) => (
        <Link
          className="font-semibold text-gov-green underline underline-offset-4"
          to={`/admin/applications/${row.applicationId}`}
        >
          {row.applicationNumber ?? row.applicationId}
        </Link>
      ),
    },
    { key: "studentName", heading: "Student" },
    {
      key: "createdAt",
      heading: "Uploaded",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      heading: "Actions",
      render: (row) => (
        <Button
          disabled={downloadingId === row.id}
          onClick={() => void download(row)}
          size="sm"
          variant="secondary"
        >
          {downloadingId === row.id ? "Downloading…" : "Download"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
      <Table
        caption="Private application documents available to administrators"
        columns={columns}
        emptyMessage="No documents match this search."
        rows={rows}
      />
    </div>
  );
}
