import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import { Card, Section } from "../components/ui/Card.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Table from "../components/ui/Table.jsx";
import { publicPages } from "../content/publicPages.js";
import { authApi } from "../services/authApi.js";

const resourceByPath = {
  "/hostel-details": "hostels",
  "/facilities": "facilities",
  "/fee-structure": "fees",
  "/notices": "notices",
  "/rules-regulations": "rules",
  "/important-dates": "important-dates",
};

const resourceColumns = {
  hostels: [
    ["name", "Hostel"],
    ["address", "Address"],
    ["description", "Details"],
    ["capacity", "Capacity"],
  ],
  facilities: [
    ["name", "Facility"],
    ["description", "Details"],
  ],
  fees: [
    ["fee_code", "Fee code"],
    ["description", "Description"],
    ["amount", "Amount"],
    ["currency", "Currency"],
    ["effective_from", "Effective from"],
    ["effective_to", "Effective to"],
  ],
  notices: [
    ["title", "Notice"],
    ["body", "Details"],
    ["published_at", "Published"],
    ["expires_at", "Expires"],
  ],
  rules: [
    ["rule_code", "Rule code"],
    ["title", "Rule"],
    ["body", "Details"],
    ["effective_from", "Effective from"],
    ["effective_to", "Effective to"],
  ],
  "important-dates": [
    ["admission_year", "Admission year"],
    ["event_code", "Event"],
    ["title", "Details"],
    ["starts_at", "Starts"],
    ["ends_at", "Ends"],
  ],
};

function formatPublicValue(value) {
  if (!value) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }
  return String(value);
}

export default function InformationPage({ pagePath }) {
  const fallbackPage = publicPages.find((item) => item.path === pagePath);
  const [configuredContent, setConfiguredContent] = useState(null);
  const [configuredDemo, setConfiguredDemo] = useState(true);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const resource = resourceByPath[pagePath];
  const slug = pagePath.slice(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setContentUnavailable(false);
    setConfiguredContent(null);
    setRecords([]);
    Promise.allSettled([
      authApi.publicPage(slug),
      resource ? authApi.publicContent(resource) : Promise.resolve([]),
    ])
      .then(([pageResult, recordsResult]) => {
        if (!active) return;
        if (pageResult.status === "fulfilled") {
          const value = pageResult.value.content;
          setConfiguredDemo(pageResult.value.isDemo);
          setConfiguredContent(
            value && typeof value === "object" && !Array.isArray(value)
              ? value
              : null,
          );
        } else {
          setConfiguredContent(null);
          setConfiguredDemo(true);
          setContentUnavailable(true);
        }
        if (recordsResult.status === "fulfilled") {
          setRecords(recordsResult.value);
        } else {
          setRecords([]);
          if (resource) setContentUnavailable(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pagePath, resource, slug]);

  if (!fallbackPage) return null;
  const configured = configuredContent ?? {};
  const page = {
    ...fallbackPage,
    ...configured,
    title:
      typeof configured.title === "string"
        ? configured.title
        : fallbackPage.title,
    eyebrow:
      typeof configured.eyebrow === "string"
        ? configured.eyebrow
        : fallbackPage.eyebrow,
    description:
      typeof configured.description === "string"
        ? configured.description
        : fallbackPage.description,
  };
  const pageFaqs = Array.isArray(page.faqs)
    ? page.faqs.filter(
        (faq) =>
          typeof faq?.question === "string" && typeof faq?.answer === "string",
      )
    : [];
  const pageSections = Array.isArray(page.sections)
    ? page.sections.filter((section) => typeof section?.title === "string")
    : [];
  const table = page.table;
  const validTable =
    table &&
    Array.isArray(table.columns) &&
    table.columns.every(
      (column) =>
        typeof column?.key === "string" && typeof column?.heading === "string",
    ) &&
    Array.isArray(table.rows) &&
    table.rows.every(
      (row) => row && typeof row === "object" && !Array.isArray(row),
    );
  const columns = resourceColumns[resource];
  const liveTable =
    records.length > 0 && columns
      ? {
          caption: `${page.title} from published portal content`,
          columns: columns.map(([key, heading]) => ({ key, heading })),
          rows: records.map((record) =>
            Object.fromEntries(
              columns.map(([key]) => [key, formatPublicValue(record[key])]),
            ),
          ),
        }
      : null;
  const displayTable = liveTable ?? (validTable ? table : null);
  const isDemo =
    configuredDemo !== false ||
    records.some((record) => record.is_demo === true) ||
    (!configuredContent && records.length === 0);

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: page.title }]}
        description={page.description}
        eyebrow={page.eyebrow}
        title={page.title}
      />

      <div className="flex flex-wrap items-center gap-3">
        {isDemo ? (
          <Badge tone="warning">DEMO DATA — NOT OFFICIAL GOVERNMENT DATA</Badge>
        ) : (
          <Badge tone="info">Portal-managed information</Badge>
        )}
        {loading && (
          <span className="text-sm text-gov-muted">Refreshing content…</span>
        )}
      </div>

      {contentUnavailable && (
        <Alert title="Live content is unavailable" tone="warning">
          The page is showing clearly marked demo guidance until the content
          service is available.
        </Alert>
      )}

      {displayTable && (
        <Section title={page.tableTitle ?? page.title}>
          <Table
            caption={displayTable.caption}
            columns={displayTable.columns}
            rows={displayTable.rows}
          />
        </Section>
      )}

      {pageFaqs.length > 0 && (
        <Section title="Answers">
          <div className="divide-y divide-gov-border border-y border-gov-border bg-white">
            {pageFaqs.map((faq) => (
              <details className="group px-4 py-4 sm:px-5" key={faq.question}>
                <summary className="cursor-pointer list-none pr-8 font-semibold text-gov-ink marker:hidden focus-visible:outline-2 focus-visible:outline-gov-gold">
                  <span className="mr-3 text-gov-green" aria-hidden="true">
                    +
                  </span>
                  {faq.question}
                </summary>
                <p className="mt-3 max-w-3xl pl-7 text-sm leading-6 text-gov-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </Section>
      )}

      <div className="space-y-5">
        {pageSections.map((section) => (
          <Section key={section.title} title={section.title}>
            <Card>
              {typeof section.body === "string" && (
                <p className="max-w-4xl whitespace-pre-wrap leading-7 text-gov-muted">
                  {section.body}
                </p>
              )}
              {Array.isArray(section.points) && (
                <ul className="mt-4 grid gap-2 border-t border-gov-border pt-4 text-sm text-gov-ink sm:grid-cols-3">
                  {section.points
                    .filter((point) => typeof point === "string")
                    .map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                </ul>
              )}
            </Card>
          </Section>
        ))}
      </div>

      {isDemo && (
        <Alert title="DEMO DATA — NOT OFFICIAL GOVERNMENT DATA" tone="warning">
          Verify eligibility, fees, dates, document requirements, and
          accommodation availability with the responsible authority.
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Button to="/important-dates" variant="secondary">
          Important dates
        </Button>
        <Button to="/notices" variant="quiet">
          Public notices
        </Button>
        <Link
          className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-gov-green underline underline-offset-4"
          to="/contact"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}
