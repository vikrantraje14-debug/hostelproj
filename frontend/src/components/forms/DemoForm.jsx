import { useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "../ui/Alert.jsx";
import Button from "../ui/Button.jsx";
import { FormField, Input, Select } from "../ui/FormControls.jsx";
import { SuccessMessage } from "../ui/Feedback.jsx";

export default function DemoForm({ fields, submitLabel = "Continue" }) {
  const [complete, setComplete] = useState(false);
  const { handleSubmit, register, reset } = useForm({ mode: "onTouched" });

  function onDemoSubmit() {
    setComplete(true);
    reset();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Alert title="DEMO FORM — no data is sent or saved" tone="warning">
        Do not enter real passwords, identity details, or personal documents.
        This page has no authentication or application service.
      </Alert>
      {complete && (
        <SuccessMessage title="Demo interaction complete">
          No account was created, no application was submitted, and no
          information was transmitted or stored.
        </SuccessMessage>
      )}
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(onDemoSubmit)}
      >
        {fields.map((field) => (
          <FormField
            hint={field.hint}
            id={field.name}
            key={field.name}
            label={field.label}
            required={field.required}
          >
            {field.options ? (
              <Select
                autoComplete="off"
                {...register(field.name, { required: field.required })}
              >
                <option value="">Select an example</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                autoComplete="off"
                placeholder={field.placeholder}
                type={field.type ?? "text"}
                {...register(field.name, { required: field.required })}
              />
            )}
          </FormField>
        ))}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit">{submitLabel}</Button>
          <span className="text-sm text-gov-muted">Local visual demo only</span>
        </div>
      </form>
    </div>
  );
}
