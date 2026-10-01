import { useEffect, useState } from "react";
import AdminDocumentTable from "../components/admin/AdminDocumentTable.jsx";
import AdminPagination from "../components/admin/AdminPagination.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

export default function AdminDocumentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({
    documents: [],
    total: 0,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    authApi
      .adminDocuments({ page, pageSize: 20, ...(search ? { search } : {}) })
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

  return (
    <div className="space-y-6">
      <PageHeader
        description="Private files are delivered through authenticated application access, never public storage links."
        eyebrow="Secure records"
        title="Documents"
      />
      <form
        className="flex flex-col gap-3 border-y border-gov-border py-4 sm:flex-row"
        onSubmit={submitSearch}
      >
        <label className="sr-only" htmlFor="document-search">
          Search documents
        </label>
        <input
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-slate-400 bg-white px-3 text-sm"
          id="document-search"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Filename, application, or student"
          value={searchInput}
        />
        <button
          className="min-h-11 rounded-sm bg-gov-green px-5 text-sm font-semibold text-white"
          type="submit"
        >
          Search documents
        </button>
      </form>
      {loading && <LoadingState label="Loading documents…" />}
      {error && (
        <ErrorState description={error} title="Document register unavailable" />
      )}
      {!loading && !error && (
        <>
          <AdminDocumentTable rows={result.documents} />
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
