import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import LogoutButton from "../components/site/LogoutButton.jsx";
import Alert from "../components/ui/Alert.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .studentProfile()
      .then((result) => {
        if (active) setProfile(result);
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
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Student account" },
        ]}
        description="Your account and application information are visible only to you."
        eyebrow="Student services"
        title="Student account"
        actions={<LogoutButton />}
      />
      {error && <ErrorState description={error} title="Profile unavailable" />}
      {loading ? (
        <LoadingState label="Loading your profile…" />
      ) : (
        profile && (
          <Card className="max-w-2xl">
            <h2 className="font-display text-xl font-semibold">Profile</h2>
            <dl className="mt-4 grid gap-4 border-t border-gov-border pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gov-muted">Name</dt>
                <dd className="mt-1 font-semibold">{profile.fullName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">Email</dt>
                <dd className="mt-1 break-all font-semibold">
                  {profile.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">Student number</dt>
                <dd className="mt-1 font-semibold">
                  {profile.studentNumber ?? "Not assigned"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gov-muted">Role</dt>
                <dd className="mt-1 font-semibold">{user.role}</dd>
              </div>
            </dl>
          </Card>
        )
      )}
      <Alert title="Application access" tone="info">
        Application records are loaded from protected endpoints scoped to your
        account.
      </Alert>
      <Link
        className="inline-flex min-h-11 items-center font-semibold text-gov-green underline underline-offset-4"
        to="/student/applications"
      >
        View my applications
      </Link>
    </div>
  );
}
