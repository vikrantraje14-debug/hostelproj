import { useFormContext } from "react-hook-form";
import { FormField, Input, Select, Textarea } from "../ui/FormControls.jsx";

export default function ApplicationField({
  autoComplete = "off",
  hint,
  kind = "text",
  label,
  name,
  options,
  placeholder,
  required = false,
  rules = {},
  type = "text",
}) {
  const {
    formState: { errors },
    register,
  } = useFormContext();
  const error = errors[name]?.message;
  const registration = register(name, {
    ...(required ? { required: `${label} is required.` } : {}),
    ...rules,
  });

  let control;
  if (kind === "select") {
    control = (
      <Select autoComplete={autoComplete} {...registration}>
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  } else if (kind === "textarea") {
    control = <Textarea placeholder={placeholder} {...registration} />;
  } else {
    control = (
      <Input
        accept={kind === "file" ? ".pdf,.jpg,.jpeg,.png" : undefined}
        autoComplete={autoComplete}
        multiple={kind === "file"}
        placeholder={placeholder}
        type={kind === "file" ? "file" : type}
        {...registration}
      />
    );
  }

  return (
    <FormField
      error={error}
      hint={hint}
      id={name}
      label={label}
      required={required}
    >
      {control}
    </FormField>
  );
}