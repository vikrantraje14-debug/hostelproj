import Button from "../ui/Button.jsx";

export default function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t border-gov-border pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-gov-muted">
        {first}–{last} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          variant="secondary"
        >
          Previous
        </Button>
        <span aria-current="page" className="px-2 text-sm tabular-nums">
          Page {Math.min(page, totalPages)} of {totalPages}
        </span>
        <Button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          variant="secondary"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
