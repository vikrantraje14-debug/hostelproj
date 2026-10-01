import { Link } from "react-router-dom";
import LoginForm from "../components/forms/LoginForm.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

export default function AdminLoginPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Admin sign in" }]}
        description="Administrative access is limited to provisioned admin accounts."
        eyebrow="Administrative access"
        title="Admin sign in"
      />
      <LoginForm role="ADMIN" />
      <p className="text-sm text-gov-muted">
        <Link
          className="font-semibold text-gov-green underline"
          to="/student-login"
        >
          Student sign in
        </Link>
      </p>
    </div>
  );
}
