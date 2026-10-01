import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminPagination from "../components/admin/AdminPagination.jsx";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Table from "../components/ui/Table.jsx";
import { adminContentResources } from "../content/adminContentResources.js";
import { authApi } from "../services/authApi.js";

const demoDisclaimer = "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA";

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getInitialValues(definition) {
  return { ...definition.defaults };
}

function getRecordValues(definition, record) {
  return Object.fromEntries(
    definition.fields.map(({ key, type }) => {
      const value = record[key];
      if (type === "json") return [key, JSON.stringify(value ?? {}, null, 2)];
      if (type === "datetime") return [key, toLocalDateTime(value)];
      if (type === "checkbox") return [key, Boolean(value)];
      return [key, value ?? ""];
    }),
  );
}

function formatCell(key, value) {
  if (key === "isDemo") return value ? demoDisclaimer : "Non-demo content";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (["startsAt", "endsAt", "expiresAt"].includes(key)) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }
  return String(value);
}

function ContentField({ field, value, relatedHostels, onChange }) {
  const id = `content-${field.key}`;
  if (field.type === "checkbox") {
    return (
      <label
        className="flex min-h-11 items-center gap-3 text-sm font-semibold text-gov-ink"
        htmlFor={id}
      >
        <input
          checked={Boolean(value)}
          className="size-4 accent-gov-green"
          id={id}
          onChange={(event) => onChange(field.key, event.target.checked)}
          type="checkbox"
        />
        {field.label}
      </label>
    );
  }

  const controlClass =
    "min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm text-gov-ink";
  let control;
  if (field.type === "textarea" || field.type === "json") {
    control = (
      <textarea
        className={`${controlClass} min-h-28`}
        id={id}
        onChange={(event) => onChange(field.key, event.target.value)}
        required={field.required}
        value={value ?? ""}
      />
    );
  } else if (field.type === "select") {
    control = (
      <select
        className={controlClass}
        id={id}
        onChange={(event) => onChange(field.key, event.target.value)}
        value={value ?? ""}
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "hostel") {
    control = (
      <select
        className={controlClass}
        id={id}
        onChange={(event) => onChange(field.key, event.target.value)}
        value={value ?? ""}
      >
        <option value="">All hostels</option>
        {relatedHostels.map((hostel) => (
          <option key={hostel.id} value={hostel.id}>
            {hostel.name}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input
        className={controlClass}
        id={id}
        max={field.max}
        maxLength={field.maxLength}
        min={field.min}
        onChange={(event) => onChange(field.key, event.target.value)}
        required={field.required}
        step={field.step}
        type={field.type === "datetime" ? "datetime-local" : field.type}
        value={value ?? ""}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gov-ink" htmlFor={id}>
        {field.label}
        {field.required && <span className="ml-1 text-rose-700">*</span>}
      </label>
      {control}
    </div>
  );
}

export default function AdminContentManagementPage({ resourceOverride }) {
  const params = useParams();
  const resource = resourceOverride ?? params.resource;
  const definition = adminContentResources[resource];
  const [result, setResult] = useState({ records: [], total: 0, pageSize: 20 });
  const [relatedHostels, setRelatedHostels] = useState([]);
  const [formValues, setFormValues] = useState(() =>
    getInitialValues(definition ?? { defaults: {} }),
  );
  const [editingId, setEditingId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!definition) return;
    setEditingId("");
    setFormValues(getInitialValues(definition));
    setSearchInput("");
    setSearch("");
    setPage(1);
    setSuccess("");
    setError("");
  }, [resource]);

  useEffect(() => {
    if (!definition) return;
    let active = true;
    setLoading(true);
    setError("");
    const requests = [
      authApi.adminContentList(resource, {
        page,
        pageSize: 20,
        ...(search ? { search } : {}),
      }),
    ];
    if (resource === "fees") {
      requests.push(
        authApi.adminContentList("hostels", { page: 1, pageSize: 100 }),
      );
    }
    Promise.all(requests)
      .then(([nextResult, hostelResult]) => {
        if (!active) return;
        setResult(nextResult);
        if (hostelResult) setRelatedHostels(hostelResult.records);
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
  }, [resource, definition, page, search]);

  function resetForm() {
    setEditingId("");
    setFormValues(getInitialValues(definition));
  }

  function editRecord(record) {
    setEditingId(record.id);
    setFormValues(getRecordValues(definition, record));
    setSuccess("");
    setError("");
    document
      .getElementById("content-editor-heading")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeField(key, value) {
    if (
      key === "isDemo" &&
      formValues.isDemo === true &&
      value === false &&
      !window.confirm(
        "Only clear the demo label after the content has been verified and approved for public use. Continue?",
      )
    ) {
      return;
    }
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function buildPayload() {
    const payload = { ...formValues };
    for (const field of definition.fields) {
      const value = payload[field.key];
      if (field.type === "number") {
        payload[field.key] =
          value === "" || value == null ? null : Number(value);
      } else if (field.type === "hostel") {
        payload[field.key] = value || null;
      } else if (field.type === "date" || field.type === "datetime") {
        payload[field.key] = value
          ? field.type === "datetime"
            ? new Date(value).toISOString()
            : value
          : null;
      } else if (field.type === "json") {
        try {
          payload[field.key] = JSON.parse(value);
        } catch {
          throw new Error("Settings value must be valid JSON.");
        }
      }
    }
    return payload;
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = buildPayload();
      if (editingId) {
        await authApi.updateAdminContent(resource, editingId, payload);
        setSuccess(`${definition.title} record updated.`);
      } else {
        await authApi.createAdminContent(resource, payload);
        setSuccess(`${definition.title} record created.`);
      }
      resetForm();
      const refreshed = await authApi.adminContentList(resource, {
        page,
        pageSize: 20,
        ...(search ? { search } : {}),
      });
      setResult(refreshed);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    const action = resource === "hostels" ? "deactivate" : "permanently delete";
    if (
      !window.confirm(
        `${action} this ${definition.title.toLowerCase()} record?`,
      )
    )
      return;
    setError("");
    setSuccess("");
    try {
      await authApi.deleteAdminContent(resource, record.id);
      setSuccess(
        resource === "hostels" ? "Hostel deactivated." : "Record deleted.",
      );
      const refreshed = await authApi.adminContentList(resource, {
        page,
        pageSize: 20,
        ...(search ? { search } : {}),
      });
      setResult(refreshed);
      if (editingId === record.id) resetForm();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  if (!definition) {
    return (
      <ErrorState
        description="Choose a supported content module."
        title="Unknown content module"
      />
    );
  }

  const columns = [
    ...definition.columns.map((key) => ({
      key,
      heading:
        definition.fields.find((field) => field.key === key)?.label ?? key,
      render: (record) => (
        <span className="wrap-break-word">{formatCell(key, record[key])}</span>
      ),
    })),
    {
      key: "actions",
      heading: "Actions",
      render: (record) => (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => editRecord(record)}
            size="sm"
            variant="secondary"
          >
            Edit
          </Button>
          <Button
            onClick={() => void deleteRecord(record)}
            size="sm"
            variant="quiet"
          >
            {resource === "hostels" ? "Deactivate" : "Delete"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description={definition.description}
        eyebrow="Content management"
        title={definition.title}
      />
      <Alert title={demoDisclaimer} tone="warning">
        New records are marked as demo data by default. Only clear the demo flag
        after the information has been verified and approved for public use.
      </Alert>
      {success && (
        <p
          className="border-l-4 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          {success}
        </p>
      )}
      {error && (
        <ErrorState description={error} title="Content operation failed" />
      )}

      <section className="space-y-4 border-y border-gov-border py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {editingId ? "Edit record" : "Add record"}
            </h2>
            {editingId && (
              <p className="mt-1 text-sm text-gov-muted">
                Changes are written to the audit log.
              </p>
            )}
          </div>
          <Button
            onClick={() => {
              resetForm();
              setError("");
            }}
            variant="secondary"
          >
            {editingId ? "Cancel edit" : "Clear form"}
          </Button>
        </div>
        <form className="space-y-5" onSubmit={saveRecord}>
          <h3 className="sr-only" id="content-editor-heading">
            Content editor
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {definition.fields.map((field) => (
              <div
                className={
                  field.type === "textarea" || field.type === "json"
                    ? "sm:col-span-2 lg:col-span-3"
                    : ""
                }
                key={field.key}
              >
                <ContentField
                  field={field}
                  onChange={changeField}
                  relatedHostels={relatedHostels}
                  value={formValues[field.key]}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={saving} type="submit">
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Create record"}
            </Button>
            {editingId && (
              <Button disabled={saving} onClick={resetForm} variant="secondary">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <label className="sr-only" htmlFor="content-search">
            Search {definition.title}
          </label>
          <input
            className="min-h-11 min-w-0 flex-1 rounded-sm border border-slate-400 bg-white px-3 text-sm"
            id="content-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={`Search ${definition.title.toLowerCase()}`}
            value={searchInput}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        {loading && (
          <LoadingState label={`Loading ${definition.title.toLowerCase()}…`} />
        )}
        {!loading && !error && (
          <>
            <Table
              caption={`Admin-managed ${definition.title.toLowerCase()}`}
              columns={columns}
              emptyMessage={`No ${definition.title.toLowerCase()} records found.`}
              rows={result.records}
            />
            <AdminPagination
              onPageChange={setPage}
              page={page}
              pageSize={result.pageSize}
              total={result.total}
            />
          </>
        )}
      </section>
    </div>
  );
}
