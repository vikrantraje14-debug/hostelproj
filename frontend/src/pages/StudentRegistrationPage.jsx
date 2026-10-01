import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import { FormField, Input } from "../components/ui/FormControls.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

export default function StudentRegistrationPage() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const { formState, handleSubmit, register, watch } = useForm();

  async function submit({ fullName, email, password }) {
    setApiError("");
    try {
      await registerStudent({ fullName, email, password });
      navigate("/student", { replace: true });
    } catch (error) {
      setApiError(error.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Student registration" },
        ]}
        description="Create a student account. Admin accounts are provisioned separately and cannot be created here."
        eyebrow="Student services"
        title="Student registration"
      />
      {apiError && (
        <Alert title="Registration failed" tone="danger">
          {apiError}
        </Alert>
      )}
      <form
        className="max-w-xl space-y-5"
        noValidate
        onSubmit={handleSubmit(submit)}
      >
        <FormField
          error={formState.errors.fullName?.message}
          id="register-name"
          label="Full name"
          required
        >
          <Input
            autoComplete="name"
            {...register("fullName", {
              required: "Enter your full name.",
              minLength: {
                value: 2,
                message: "Enter at least two characters.",
              },
              maxLength: {
                value: 120,
                message: "Name must be 120 characters or fewer.",
              },
            })}
          />
        </FormField>
        <FormField
          error={formState.errors.email?.message}
          id="register-email"
          label="Email address"
          required
        >
          <Input
            autoComplete="email"
            type="email"
            {...register("email", {
              required: "Enter your email address.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Enter a valid email address.",
              },
            })}
          />
        </FormField>
        <FormField
          error={formState.errors.password?.message}
          hint="Use 12 to 128 characters. Passwords are hashed before storage."
          id="register-password"
          label="Password"
          required
        >
          <Input
            autoComplete="new-password"
            type="password"
            {...register("password", {
              required: "Enter a password.",
              minLength: { value: 12, message: "Use at least 12 characters." },
              maxLength: {
                value: 128,
                message: "Password must be 128 characters or fewer.",
              },
            })}
          />
        </FormField>
        <FormField
          error={formState.errors.confirmPassword?.message}
          id="register-confirm-password"
          label="Confirm password"
          required
        >
          <Input
            autoComplete="new-password"
            type="password"
            {...register("confirmPassword", {
              required: "Confirm your password.",
              validate: (value) =>
                value === watch("password") || "Passwords do not match.",
            })}
          />
        </FormField>
        <Button disabled={formState.isSubmitting} type="submit">
          {formState.isSubmitting
            ? "Creating account…"
            : "Create student account"}
        </Button>
      </form>
      <p className="text-sm text-gov-muted">
        Already registered?{" "}
        <Link
          className="font-semibold text-gov-green underline"
          to="/student-login"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
