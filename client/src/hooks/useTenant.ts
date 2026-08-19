/**
 * Hook para resolução de tenant no frontend.
 * Detecta o subdomínio atual e retorna o slug e churchId da igreja.
 *
 * Em produção: igrejaviver.idefazei.com.br → slug = "igrejaviver"
 * Em desenvolvimento: localhost:3000 → slug = null (domínio principal)
 *
 * O churchId é lido do localStorage após o login (armazenado pelo LoginIgreja).
 */

import { useMemo } from "react";

export type TenantInfo = {
  slug: string | null;
  churchId: number | null;
  isChurchSubdomain: boolean;
  isSuperAdminDomain: boolean;
};

/**
 * Extrai o slug do subdomínio do hostname atual.
 * Ex: igrejaviver.idefazei.com.br → "igrejaviver"
 * Ex: admin.idefazei.com.br → null (admin domain)
 * Ex: localhost → null (domínio principal)
 */
function extractSlugFromHostname(hostname: string): string | null {
  const parts = hostname.split(".");
  // Subdomínio válido: 3+ partes, não é www nem admin
  if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "admin") {
    return parts[0];
  }
  return null;
}

export function useTenant(): TenantInfo {
  return useMemo(() => {
    const hostname = window.location.hostname;
    const slug = extractSlugFromHostname(hostname);
    const parts = hostname.split(".");
    const isSuperAdminDomain = parts[0] === "admin";

    // Tenta recuperar o churchId do usuário logado no localStorage
    let churchId: number | null = null;
    try {
      const stored = localStorage.getItem("church_user");
      if (stored) {
        const user = JSON.parse(stored) as { churchId?: number };
        if (user.churchId) churchId = user.churchId;
      }
    } catch {
      // Ignora erros de parse
    }

    return {
      slug,
      churchId,
      isChurchSubdomain: slug !== null,
      isSuperAdminDomain,
    };
  }, []);
}

/**
 * Retorna o slug da igreja a partir do hostname atual.
 * Útil para componentes que só precisam do slug.
 */
export function useChurchSlug(): string | null {
  const { slug } = useTenant();
  return slug;
}

/**
 * Retorna o churchId do usuário logado.
 * Útil para queries que precisam do churchId.
 */
export function useChurchId(): number | null {
  const { churchId } = useTenant();
  return churchId;
}
