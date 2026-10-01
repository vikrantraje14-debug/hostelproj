import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import { Card, Section } from "../components/ui/Card.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Table from "../components/ui/Table.jsx";
import { authApi } from "../services/authApi.js";

const dateColumns = [
  { key: "event", heading: "Admission event" },
  { key: "date", heading: "Date" },
  {
    key: "status",
    heading: "Status",
    render: (row) => <Badge tone="warning">{row.status}</Badge>,
  },
];

const dateRows = [
  {
    event: "Application opening",
    date: "DEMO DATA — not announced",
    status: "Awaiting official notice",
  },
  {
    event: "Application closing",
    date: "DEMO DATA — not announced",
    status: "Awaiting official notice",
  },
  {
    event: "Selection updates",
    date: "DEMO DATA — not announced",
    status: "Awaiting official notice",
  },
];

const noticeColumns = [
  { key: "notice", heading: "Notice" },
  { key: "details", heading: "Details" },
  {
    key: "status",
    heading: "Status",
    render: (row) => <Badge tone="info">{row.status}</Badge>,
  },
];

const noticeRows = [
  {
    notice: "Admission announcement",
    details: "No official notice has been supplied for this demo.",
    status: "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA",
  },
];

const faqs = [
  {
    question: "When can I apply?",
    answer:
      "No admission dates are published in this demo. Follow the current official notice for confirmed dates.",
  },
  {
    question: "Which documents are required?",
    answer:
      "The official checklist was not supplied. Do not upload or send personal documents through this demo.",
  },
  {
    question: "Can I submit an application here?",
    answer:
      "No. This is a frontend-only demonstration and does not submit or store applications.",
  },
];

const applicationSteps = [
  {
    number: "01",
    title: "Read the official notice",
    text: "Confirm the current cycle, eligibility, and instructions with the issuing authority.",
  },
  {
    number: "02",
    title: "Review the verified checklist",
    text: "Use only the documents and details listed in the official guidance.",
  },
  {
    number: "03",
    title: "Use the authorized channel",
    text: "Submit only through a government application channel announced by the authority.",
  },
  {
    number: "04",
    title: "Keep your reference",
    text: "Follow the official instructions for acknowledgement and status updates.",
  },
];

export default function HomePage() {
  const [homeContent, setHomeContent] = useState(null);
  const [homeIsDemo, setHomeIsDemo] = useState(true);
  const [importantDates, setImportantDates] = useState([]);
  const [notices, setNotices] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [hostels, setHostels] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      authApi.publicPage("home"),
      authApi.publicContent("important-dates"),
      authApi.publicContent("notices"),
      authApi.publicContent("facilities"),
      authApi.publicContent("hostels"),
    ]).then(
      ([
        pageResult,
        datesResult,
        noticesResult,
        facilitiesResult,
        hostelsResult,
      ]) => {
        if (!active) return;
        if (pageResult.status === "fulfilled") {
          const content = pageResult.value.content;
          setHomeIsDemo(pageResult.value.isDemo !== false);
          setHomeContent(
            content && typeof content === "object" && !Array.isArray(content)
              ? content
              : null,
          );
        }
        if (datesResult.status === "fulfilled")
          setImportantDates(datesResult.value);
        if (noticesResult.status === "fulfilled")
          setNotices(noticesResult.value);
        if (facilitiesResult.status === "fulfilled")
          setFacilities(facilitiesResult.value);
        if (hostelsResult.status === "fulfilled")
          setHostels(hostelsResult.value);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const liveDateRows = importantDates.map((event) => ({
    event: event.title,
    date: event.starts_at
      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
          new Date(event.starts_at),
        )
      : "Date to be announced",
    status: event.is_demo
      ? "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA"
      : "Published",
  }));
  const liveNoticeRows = notices.map((notice) => ({
    notice: notice.title,
    details: notice.body,
    status: notice.is_demo
      ? "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA"
      : "Published",
  }));
  const homeFaqs = Array.isArray(homeContent?.faqs)
    ? homeContent.faqs.filter(
        (faq) =>
          typeof faq.question === "string" && typeof faq.answer === "string",
      )
    : faqs;
  const homeSteps = Array.isArray(homeContent?.applicationSteps)
    ? homeContent.applicationSteps.filter(
        (step) =>
          typeof step.number === "string" &&
          typeof step.title === "string" &&
          typeof step.text === "string",
      )
    : applicationSteps;
  const managedSections = Array.isArray(homeContent?.sections)
    ? homeContent.sections.filter(
        (section) => typeof section?.title === "string",
      )
    : null;

  return (
    <div className="space-y-12 sm:space-y-16">
      <section
        className="relative -mx-4 -mt-8 min-h-96 overflow-hidden bg-gov-ink sm:-mx-6 sm:-mt-10 lg:-mx-8"
        id="home"
      >
        <img
          alt="Illustrative university campus exterior; this image does not represent a listed hostel."
          className="absolute inset-0 size-full object-cover object-center"
          fetchPriority="high"
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1800&q=85"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gov-ink/75" />
        <div className="relative mx-auto flex min-h-96 max-w-7xl flex-col justify-center px-4 py-10 text-white sm:px-6 lg:px-8">
          <Badge className="self-start bg-white/15 text-white">
            Public student services
          </Badge>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {homeContent?.title ?? "Government hostel admission"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
            {homeContent?.description ??
              "Find hostel information, admission guidance, and official updates in one place."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              className="border-white bg-white text-gov-ink hover:bg-gov-page"
              to="/apply-online"
            >
              Apply now
            </Button>
            <Button
              className="border-white/70 bg-transparent text-white hover:bg-white/10"
              to="/application-status"
              variant="secondary"
            >
              Check application status
            </Button>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/80">
            Demonstration website · no applications are accepted here
          </p>
        </div>
      </section>

      {homeIsDemo && homeContent && (
        <Badge tone="warning">DEMO DATA — NOT OFFICIAL GOVERNMENT DATA</Badge>
      )}

      {managedSections ? (
        <div className="space-y-6">
          {managedSections.map((section) => {
            const columns = Array.isArray(section.table?.columns)
              ? section.table.columns.filter(
                  (column) =>
                    typeof column.key === "string" &&
                    typeof column.heading === "string",
                )
              : [];
            const rows = Array.isArray(section.table?.rows)
              ? section.table.rows.filter(
                  (row) =>
                    row && typeof row === "object" && !Array.isArray(row),
                )
              : [];
            return (
              <Section
                description={
                  typeof section.description === "string"
                    ? section.description
                    : undefined
                }
                key={section.title}
                title={section.title}
              >
                {typeof section.body === "string" && (
                  <p className="max-w-4xl whitespace-pre-wrap leading-7 text-gov-muted">
                    {section.body}
                  </p>
                )}
                {Array.isArray(section.points) && (
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gov-ink">
                    {section.points
                      .filter((point) => typeof point === "string")
                      .map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                  </ul>
                )}
                {columns.length > 0 && (
                  <Table
                    caption={
                      typeof section.table?.caption === "string"
                        ? section.table.caption
                        : section.title
                    }
                    columns={columns}
                    rows={rows}
                  />
                )}
              </Section>
            );
          })}
        </div>
      ) : (
        <>
          <Section
            description="Use this portal to find public information and navigate to the relevant guidance. All admission-specific content in this demo is illustrative and must be confirmed with the responsible government authority."
            eyebrow="Welcome"
            id="introduction"
            title="Information for students and families"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <h3 className="font-display text-xl font-semibold">
                  A clear starting point
                </h3>
                <p className="mt-2 text-sm leading-6 text-gov-muted">
                  Browse hostel details, facilities, eligibility, rules, fees,
                  documents, dates, and notices from the links on this site.
                </p>
              </Card>
              <Card className="border-l-4 border-l-gov-gold">
                <h3 className="font-display text-xl font-semibold">
                  Check before acting
                </h3>
                <p className="mt-2 text-sm leading-6 text-gov-muted">
                  No official admission policy or contact directory was
                  supplied. Verify current requirements and dates through an
                  official source.
                </p>
              </Card>
            </div>
          </Section>

          <section className="space-y-4" id="admission-notification">
            <div className="max-w-3xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gov-green">
                Admission notification
              </p>
              <h2 className="font-display text-2xl font-semibold text-gov-ink sm:text-3xl">
                {notices.length
                  ? notices[0].title
                  : "No official notice supplied"}
              </h2>
              <p className="mt-2 leading-7 text-gov-muted">
                Check here for announcements published by the responsible
                authority.
              </p>
            </div>
            {notices.length === 0 || notices[0]?.is_demo ? (
              <Alert
                title="DEMO DATA — NOT OFFICIAL GOVERNMENT DATA"
                tone="warning"
              >
                This site contains no verified admission notification. The Apply
                Now link opens a non-submitting UI preview only.
              </Alert>
            ) : (
              <p className="border-l-4 border-gov-green bg-white px-4 py-3 text-sm leading-6">
                {notices[0].body}
              </p>
            )}
          </section>

          <Section
            description={
              importantDates.length
                ? "Admission events published by the content team. Check the notice for verified instructions."
                : "Dates are not available in this demo. Do not use these placeholders to plan or submit an application."
            }
            eyebrow="Admission calendar"
            id="important-dates"
            title="Important dates"
          >
            <Table
              caption={
                importantDates.length
                  ? "Published admission dates"
                  : "Demonstration admission dates, all unannounced"
              }
              columns={dateColumns}
              rows={liveDateRows.length ? liveDateRows : dateRows}
            />
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
              to="/important-dates"
            >
              View date information
            </Link>
          </Section>

          <Section
            description="Official eligibility criteria have not been supplied. No student should treat this summary as a policy decision."
            eyebrow="Before you apply"
            id="eligibility-summary"
            title="Eligibility guidance"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <Card>
                <Badge tone="warning">DEMO DATA</Badge>
                <p className="mt-3 leading-7 text-gov-muted">
                  The responsible authority must publish the applicable
                  criteria. Review the official notice for verified conditions
                  and accepted evidence.
                </p>
              </Card>
              <Button to="/eligibility" variant="secondary">
                Read eligibility guidance
              </Button>
            </div>
          </Section>

          <Section
            description="The facility directory has not been provided; this page does not claim that any specific facility is available."
            eyebrow="Accommodation"
            id="facilities-summary"
            title="Hostel facilities"
          >
            {hostels.length > 0 && (
              <p className="mb-4 border-l-4 border-gov-gold bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                {hostels.some((hostel) => hostel.is_demo)
                  ? `DEMO DATA — NOT OFFICIAL GOVERNMENT DATA. ${hostels.length} hostel records are listed; capacity does not indicate vacancies.`
                  : `${hostels.length} hostel directory records are available. Capacity does not indicate vacancies.`}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(facilities.length
                ? facilities
                    .slice(0, 3)
                    .map((facility) => [
                      facility.name,
                      facility.description ||
                        "See the current facility record for details.",
                    ])
                : [
                    [
                      "Facilities directory",
                      "DEMO DATA — no verified facility list supplied.",
                    ],
                    [
                      "Hostel locations",
                      "DEMO DATA — no verified hostel directory supplied.",
                    ],
                    [
                      "Availability",
                      "DEMO DATA — no capacity or vacancy information supplied.",
                    ],
                  ]
              ).map(([title, description], index) => (
                <Card as="article" className="h-full" key={title}>
                  <Badge
                    tone={
                      facilities[index]?.is_demo === false ? "info" : "warning"
                    }
                  >
                    {facilities[index]?.is_demo === false
                      ? "Published listing"
                      : "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA"}
                  </Badge>
                  <h3 className="mt-3 font-display text-lg font-semibold">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gov-muted">
                    {description}
                  </p>
                </Card>
              ))}
            </div>
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
              to="/facilities"
            >
              View facilities information
            </Link>
          </Section>

          <Section
            description="A general orientation only. The authorized process and deadlines must come from the current official notice."
            eyebrow="How it works"
            id="application-process"
            title="Application process"
          >
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {homeSteps.map((step) => (
                <li
                  className="border-t-2 border-gov-green bg-white px-4 py-5"
                  key={step.number}
                >
                  <p className="font-display text-2xl font-semibold text-gov-green">
                    {step.number}
                  </p>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gov-muted">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            description="The final checklist is not available. This site does not collect documents."
            eyebrow="Prepare carefully"
            id="documents-summary"
            title="Required documents"
          >
            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge tone="warning">DEMO DATA — checklist not supplied</Badge>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gov-muted">
                  Wait for the official document checklist before preparing or
                  sharing personal records. Do not upload documents on this
                  demonstration website.
                </p>
              </div>
              <Button to="/required-documents" variant="secondary">
                View document guidance
              </Button>
            </Card>
          </Section>

          <Section
            description="No official notices were supplied for this demo."
            eyebrow="Official updates"
            id="notices-preview"
            title="Notices"
          >
            <Table
              caption={
                notices.length
                  ? "Published notices"
                  : "Demonstration notices; no government notices supplied"
              }
              columns={noticeColumns}
              rows={liveNoticeRows.length ? liveNoticeRows : noticeRows}
            />
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
              to="/notices"
            >
              View all notices
            </Link>
          </Section>

          <Section
            description="These sample answers do not establish admission policy."
            eyebrow="Quick answers"
            id="faq-preview"
            title="Frequently asked questions"
          >
            <div className="divide-y divide-gov-border border-y border-gov-border bg-white">
              {homeFaqs.map((faq) => (
                <details className="px-4 py-4 sm:px-5" key={faq.question}>
                  <summary className="cursor-pointer font-semibold text-gov-ink focus-visible:outline-2 focus-visible:outline-gov-gold">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gov-muted">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
              to="/faqs"
            >
              Read all FAQs
            </Link>
          </Section>

          <section
            aria-labelledby="contact-preview-title"
            className="border-l-4 border-gov-gold bg-white px-5 py-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7"
            id="contact-preview"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gov-green">
                Student assistance
              </p>
              <h2
                className="mt-2 font-display text-2xl font-semibold"
                id="contact-preview-title"
              >
                Contact the admission office
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gov-muted">
                DEMO DATA: verified office contact details have not been
                supplied. Find current contact information in an official
                government notice.
              </p>
            </div>
            <Button
              className="mt-4 shrink-0 sm:mt-0"
              to="/contact"
              variant="secondary"
            >
              Contact information
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
