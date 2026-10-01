import LoginForm from "../components/forms/LoginForm.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

const fields = [
  {
    name: "demoEmail",
    label: "Example email address",
    placeholder: "example@example.test",
    type: "email",
    required: true,
  },
  {
    name: "demoPassword",
    label: "Example password",
    placeholder: "Do not use a real password",
    type: "password",
    required: true,
  },
];

export default function StudentLoginPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Student sign in" },
        ]}
        description="Sign in to access your student profile and your own application information."
        eyebrow="Student services"
        title="Student sign in"
      />
      <LoginForm role="STUDENT" />
    </div>
  );
}
