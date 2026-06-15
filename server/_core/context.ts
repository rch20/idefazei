import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getChurchBySlug } from "../db";

/**
 * Extrai o slug do subdomínio do host da requisição.
 * Ex: igrejaviver.lampas.com.br -> "igrejaviver"
 * Ex: localhost:3000 -> null (domínio principal)
 */
function extractTenantSlug(host: string | undefined): string | null {
  if (!host) return null;
  // Remove porta se existir
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  // Só é subdomínio se tiver 3+ partes e não for www ou admin
  if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "admin") {
    return parts[0];
  }
  return null;
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantChurchId: number | null;
  tenantSlug: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let tenantChurchId: number | null = null;
  let tenantSlug: string | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Resolve tenant by subdomain
  try {
    const host = opts.req.headers.host as string | undefined;
    const slug = extractTenantSlug(host);
    if (slug) {
      const church = await getChurchBySlug(slug);
      if (church) {
        tenantChurchId = church.id;
        tenantSlug = slug;
      }
    }
  } catch {
    // Tenant resolution is optional
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantChurchId,
    tenantSlug,
  };
}
