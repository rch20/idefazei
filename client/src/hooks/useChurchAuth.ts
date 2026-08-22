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
    const storedUser = readSessionValue("church_user");
    if (!token || !storedUser) return null;

    const user = JSON.parse(storedUser) as ChurchSessionUser;
    if (!user.id || !user.churchId || !user.email) return null;
    return user;
  } catch {
    return null;
  }
}

function readSessionValue(key: string) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export function getChurchToken() {
  return readSessionValue("church_token");
}

export function clearChurchSession() {
  try {
    localStorage.removeItem("church_token");
    localStorage.removeItem("church_user");
  } catch {
    // Safari pode restringir localStorage em alguns contextos de privacidade.
  }
  try {
    sessionStorage.removeItem("church_token");
    sessionStorage.removeItem("church_user");
  } catch {
    // Sem sessão persistente disponível, o redirecionamento ao login permanece seguro.
  }
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
