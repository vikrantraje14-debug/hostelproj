import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../app/AuthContext.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking your session…" />;
  if (!user) {
    const loginPath = roles?.includes("ADMIN")
      ? "/admin/login"
      : "/student-login";
    return <Navigate replace state={{ from: location }} to={loginPath} />;
  }
  if (roles?.length && !roles.includes(user.role)) {
    return (
      <ErrorState
        description="Your account does not have permission to view this page."
        title="Access not permitted"
      />
    );
  }

  return <Outlet />;
}
