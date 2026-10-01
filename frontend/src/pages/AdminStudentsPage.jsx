import { useEffect, useState } from "react";
import AdminPagination from "../components/admin/AdminPagination.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Table from "../components/ui/Table.jsx";
import { authApi } from "../services/authApi.js";

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
}

export default function AdminStudentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({
    students: [],
    total: 0,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    authApi
      .adminStudents({ page, pageSize: 20, ...(search ? { search } : {}) })
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
  }, [page, search]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const columns = [
    { key: "fullName", heading: "Student" },
    { key: "email", heading: "Account email" },
    { key: "studentNumber", heading: "Student number" },
    { key: "applicationCount", heading: "Applications" },
    {
      key: "createdAt",
      heading: "Registered",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description="Student accounts and their application counts."
        eyebrow="People directory"
        title="Students"
      />
      <form
        className="flex flex-col gap-3 border-y border-gov-border py-4 sm:flex-row"
        onSubmit={submitSearch}
      >
        <label className="sr-only" htmlFor="student-search">
          Search students
        </label>
        <input
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-slate-400 bg-white px-3 text-sm"
          id="student-search"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Name, email, or student number"
          value={searchInput}
        />
        <button
          className="min-h-11 rounded-sm bg-gov-green px-5 text-sm font-semibold text-white"
          type="submit"
        >
          Search students
        </button>
      </form>
      {loading && <LoadingState label="Loading students…" />}
      {error && (
        <ErrorState description={error} title="Student directory unavailable" />
      )}
      {!loading && !error && (
        <>
          <Table
            caption="Registered students"
            columns={columns}
            emptyMessage="No students match this search."
            rows={result.students}
          />
          <AdminPagination
            onPageChange={setPage}
            page={page}
            pageSize={result.pageSize}
            total={result.total}
          />
        </>
      )}
    </div>
  );
}
