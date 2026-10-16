import type { CSSProperties, ReactNode } from "react";

type TenantBrand = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
};

/**
 * Casca global do Template Ministerial Base. A identidade pode trocar somente
 * variáveis seguras; proteção de viewport, mídia e estrutura fica no núcleo.
 */
export function TenantPublicShell({ brand, children }: { brand: TenantBrand; children: ReactNode }) {
  const style = {
    "--tenant-primary": brand.primaryColor ?? "#1e3a5f",
    "--tenant-secondary": brand.secondaryColor ?? "#c9a84c",
    "--tenant-accent": brand.accentColor ?? brand.secondaryColor ?? "#c9a84c",
  } as CSSProperties;

  return <div className="tenant-public-root" style={style}>{children}</div>;
}
