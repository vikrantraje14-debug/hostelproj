import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext.jsx";
import Button from "../ui/Button.jsx";

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setPending(true);
    setError("");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (logoutError) {
      setError(logoutError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button disabled={pending} onClick={handleLogout} variant="secondary">
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
