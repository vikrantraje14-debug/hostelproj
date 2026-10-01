import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gov-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li
              className="flex items-center gap-2"
              key={`${item.label}-${index}`}
            >
              {index > 0 && (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              )}
              {current || !item.href ? (
                <span aria-current={current ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link
                  className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                  to={item.href}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
