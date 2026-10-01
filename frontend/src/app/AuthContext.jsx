import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    authApi
      .currentUser()
      .then((currentUser) => {
        if (mounted) setUser(currentUser);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function login(email, password, role) {
    const currentUser = await authApi.login(email, password, role);
    setUser(currentUser);
    return currentUser;
  }

  async function registerStudent(values) {
    const currentUser = await authApi.registerStudent(values);
    setUser(currentUser);
    return currentUser;
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, registerStudent, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
