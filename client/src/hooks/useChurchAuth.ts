import { useCallback, useState } from "react";

export type ChurchSessionUser = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  churchId: number;
};

function readChurchSession(): ChurchSessionUser | null {
  try {
    const token = getChurchToken();
    const storedUser = localStorage.getItem("church_user") ?? sessionStorage.getItem("church_user");
    if (!token || !storedUser) return null;

    const user = JSON.parse(storedUser) as ChurchSessionUser;
    if (!user.id || !user.churchId || !user.email) return null;
    return user;
  } catch {
    return null;
  }
}

export function getChurchToken() {
  return localStorage.getItem("church_token") ?? sessionStorage.getItem("church_token");
}

export function clearChurchSession() {
  localStorage.removeItem("church_token");
  localStorage.removeItem("church_user");
  sessionStorage.removeItem("church_token");
  sessionStorage.removeItem("church_user");
}

/** Sessão própria da igreja, armazenada após churchAuth.login. */
export function useChurchAuth() {
  const [user, setUser] = useState<ChurchSessionUser | null>(readChurchSession);

  const logout = useCallback(() => {
    clearChurchSession();
    setUser(null);
  }, []);

  return {
    user,
    loading: false,
    isAuthenticated: Boolean(user),
    logout,
  };
}
