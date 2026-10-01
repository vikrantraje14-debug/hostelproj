import { useEffect, useState } from "react";
import AdminApplicationTable from "../components/admin/AdminApplicationTable.jsx";
import AdminPagination from "../components/admin/AdminPagination.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

const statuses = [
  ["SUBMITTED", "Submitted"],
  ["UNDER_REVIEW", "Under review"],
  ["DOCUMENT_VERIFICATION", "Document verification"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["ADDITIONAL_INFORMATION_REQUIRED", "Additional information required"],
];

export default function AdminApplicationsPage() {
  const [result, setResult] = useState({ applications: [], total: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("submissionDate");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    authApi
      .adminApplications({
        page,
        pageSize,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(admissionYear ? { admissionYear } : {}),
        sortBy,
        sortDirection,
      })
      .then((nextResult) => {
        if (active) setResult(nextResult);
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
  }, [page, pageSize, search, status, admissionYear, sortBy, sortDirection]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeSort(nextSort) {
    if (nextSort === sortBy) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSort);
      setSortDirection("asc");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Search, filter, and prioritize applications for review."
        eyebrow="Admissions queue"
        title="Applications"
      />
      <form
        className="grid gap-3 border-y border-gov-border py-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_13rem_10rem_auto] lg:items-end"
        onSubmit={submitSearch}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="application-search">
            Search
          </label>
          <input
            className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 text-sm"
            id="application-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Reference, student, college, course"
            value={searchInput}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-semibold"
            htmlFor="application-status-filter"
          >
            Status
          </label>
          <select
            className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 text-sm"
            id="application-status-filter"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All statuses</option>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-semibold"
            htmlFor="admission-year-filter"
          >
            Admission year
          </label>
          <input
            className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 text-sm"
            id="admission-year-filter"
            max="2200"
            min="1900"
            onChange={(event) => {
              setAdmissionYear(event.target.value);
              setPage(1);
            }}
            placeholder="Any year"
            type="number"
            value={admissionYear}
          />
        </div>
        <button
          className="min-h-11 rounded-sm bg-gov-green px-5 text-sm font-semibold text-white"
          type="submit"
        >
          Search
        </button>
      </form>

      {loading && <LoadingState label="Loading applications…" />}
      {error && (
        <ErrorState description={error} title="Applications unavailable" />
      )}
      {!loading && !error && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gov-muted">
              {result.total.toLocaleString()} applications
            </p>
            <label className="flex items-center gap-2 text-sm">
              Rows per page
              <select
                className="min-h-10 rounded-sm border border-slate-400 bg-white px-2"
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                value={pageSize}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <AdminApplicationTable
            onSort={changeSort}
            rows={result.applications}
            sortBy={sortBy}
            sortDirection={sortDirection}
          />
          <AdminPagination
            onPageChange={setPage}
            page={page}
            pageSize={pageSize}
            total={result.total}
          />
        </>
      )}
    </div>
  );
}
