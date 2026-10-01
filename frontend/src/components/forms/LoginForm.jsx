import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";
import Alert from "../ui/Alert.jsx";
import Button from "../ui/Button.jsx";
import { FormField, Input } from "../ui/FormControls.jsx";

export default function LoginForm({ role = "STUDENT" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState("");
  const { formState, handleSubmit, register } = useForm();

  async function submit({ email, password }) {
    setApiError("");
    try {
      const user = await login(email, password, role);
      const fallbackPath = user.role === "ADMIN" ? "/admin" : "/student";
      navigate(location.state?.from?.pathname ?? fallbackPath, {
        replace: true,
      });
    } catch (error) {
      setApiError(error.message);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      {apiError && (
        <Alert title="Sign-in failed" tone="danger">
          {apiError}
        </Alert>
      )}
      <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
        <FormField
          error={formState.errors.email?.message}
          id="login-email"
          label="Email address"
          required
        >
          <Input
            autoComplete="username"
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
          id="login-password"
          label="Password"
          required
        >
          <Input
            autoComplete="current-password"
            type="password"
            {...register("password", { required: "Enter your password." })}
          />
        </FormField>
        <Button disabled={formState.isSubmitting} type="submit">
          {formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {role === "STUDENT" && (
        <p className="text-sm text-gov-muted">
          New student?{" "}
          <Link
            className="font-semibold text-gov-green underline"
            to="/student-registration"
          >
            Create an account
          </Link>
        </p>
      )}
    </div>
  );
}
