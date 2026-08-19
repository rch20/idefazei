import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getActiveChurchUserById, getActiveSuperAdminById, getChurchBySlug } from "../db";
import { verifyToken } from "../auth";

type AuthenticatedUser = Omit<User, "role"> & {
  role: string;
  churchId?: number;
  authSource: "church" | "admin" | "manus";
};

/**
 * Extrai o slug do subdomínio do host da requisição.
 * Ex: igrejaviver.idefazei.com.br -> "igrejaviver"
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
  user: AuthenticatedUser | null;
  tenantChurchId: number | null;
  tenantSlug: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AuthenticatedUser | null = null;
  let tenantChurchId: number | null = null;
  let tenantSlug: string | null = null;

  const authorization = opts.req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (token) {
    const payload = await verifyToken(token);
    if (payload?.type === "church") {
      const churchUser = await getActiveChurchUserById(Number(payload.sub));
      if (
        churchUser &&
        churchUser.churchId === payload.churchId &&
        churchUser.role === payload.role
      ) {
        // IDs negativos distinguem sessões de church_users dos usuários Manus
        // sem alterar as procedures já existentes que esperam um número.
        user = {
          id: -churchUser.id,
          openId: `church:${churchUser.id}`,
          name: churchUser.name,
          email: churchUser.email,
          loginMethod: "church-jwt",
          role: churchUser.role,
          createdAt: churchUser.createdAt,
          updatedAt: churchUser.updatedAt,
          lastSignedIn: churchUser.lastLoginAt ?? churchUser.createdAt,
          churchId: churchUser.churchId,
          authSource: "church",
        };
        tenantChurchId = churchUser.churchId;
      }
    }

    if (payload?.type === "admin") {
      const admin = await getActiveSuperAdminById(Number(payload.sub));
      if (admin) {
        user = {
          id: -admin.id,
          openId: `admin:${admin.id}`,
          name: admin.name,
          email: admin.email,
          loginMethod: "admin-jwt",
          role: "admin",
          createdAt: admin.createdAt,
          updatedAt: admin.createdAt,
          lastSignedIn: admin.createdAt,
          authSource: "admin",
        };
      }
    }
  }

  if (!user) {
    try {
      const manusUser = await sdk.authenticateRequest(opts.req);
      user = { ...manusUser, authSource: "manus" };
    } catch {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  // Resolve tenant by subdomain
  try {
    const host = opts.req.headers.host as string | undefined;
    const slug = extractTenantSlug(host);
    if (slug) {
      const church = await getChurchBySlug(slug);
      if (church) {
        if (!user || user.authSource === "manus" || user.churchId === church.id) {
          tenantChurchId = church.id;
        }
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
