import { useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import {
  EmptyState,
  ErrorState,
  SuccessMessage,
} from "../components/ui/Feedback.jsx";
import { FormField, Input } from "../components/ui/FormControls.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

export default function ApplicationStatusPage() {
  const [showExample, setShowExample] = useState(false);
  const [invalidExample, setInvalidExample] = useState(false);
  const { handleSubmit, register } = useForm();

  function checkDemoReference({ reference }) {
    const isDemoReference = reference.trim().toUpperCase() === "DEMO-0001";
    setShowExample(isDemoReference);
    setInvalidExample(!isDemoReference);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Application status" },
        ]}
        description="A sample status-check screen. No application records or live status service are connected."
        eyebrow="Student services"
        title="Application status"
      />
      <Alert
        title="DEMO STATUS — not an actual application record"
        tone="warning"
      >
        Enter only the fictional reference DEMO-0001 to reveal the illustrative
        status below. No information is sent or saved.
      </Alert>
      <form
        className="flex max-w-xl flex-col items-start gap-4 sm:flex-row sm:items-end"
        onSubmit={handleSubmit(checkDemoReference)}
      >
        <FormField
          className="w-full"
          id="demo-reference"
          label="Fictional application reference"
          required
        >
          <Input
            autoComplete="off"
            placeholder="DEMO-0001"
            {...register("reference", { required: true })}
          />
        </FormField>
        <Button className="shrink-0" type="submit">
          Show demo status
        </Button>
      </form>
      {invalidExample && (
        <ErrorState
          description="This demo recognizes only the fictional reference DEMO-0001. No live application lookup is available."
          title="No matching demo reference"
        />
      )}
      {showExample ? (
        <Card className="max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              Example application
            </h2>
            <Badge tone="info">DEMO DATA</Badge>
          </div>
          <dl className="mt-5 grid gap-4 border-t border-gov-border pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gov-muted">Reference</dt>
              <dd className="mt-1 font-semibold">DEMO-0001</dd>
            </div>
            <div>
              <dt className="text-sm text-gov-muted">Status</dt>
              <dd className="mt-1 font-semibold">Example only</dd>
            </div>
          </dl>
          <SuccessMessage title="Illustrative status only">
            This example is not linked to an application or government record.
          </SuccessMessage>
        </Card>
      ) : (
        <EmptyState
          description="No status data is available in this frontend demo."
          title="No live status service"
        />
      )}
    </div>
  );
}
