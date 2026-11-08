import type { CSSProperties, ReactNode } from "react";
import { resolveTenantThemeVars } from "../../../shared/publicPresets";

type TenantBrand = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontPair?: string | null;
  templateKey?: string | null;
};

/**
 * Casca global do Template Ministerial Base. A identidade pode trocar somente
 * variáveis seguras (cores, fundo, superfície e par tipográfico); proteção de
 * viewport, mídia e estrutura fica no núcleo. As variáveis são resolvidas pelo
 * catálogo de identidades (shared/publicPresets), com fallback para o visual atual.
 */
export function TenantPublicShell({ brand, children }: { brand: TenantBrand; children: ReactNode }) {
  const style = resolveTenantThemeVars(brand) as CSSProperties;

  return <div className="tenant-public-root" style={style}>{children}</div>;
}
