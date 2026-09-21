import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { createHash } from "node:crypto";
import { recordSecurityAccessAuditEvent } from "../db";
import { createSecurityAccessMonitor } from "../security-access-monitoring";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const securityAccessMonitor = createSecurityAccessMonitor();

async function recordTenantAccessDenied(
  ctx: TrpcContext,
  procedurePath: string,
  reason: "jwt_host_mismatch" | "tenant_scope_mismatch"
) {
  const sessionChurchId = ctx.user?.churchId ?? null;
  const targetChurchId = ctx.requestedTenantChurchId ?? ctx.tenantChurchId;
  const ownerChurchId = targetChurchId ?? sessionChurchId;
  if (!ownerChurchId) return;

  const sourceFingerprint = createHash("sha256")
    .update(
      `${ctx.user?.authSource ?? "unknown"}|${ctx.user?.openId ?? "unknown"}`
    )
    .digest("hex")
    .slice(0, 64);
  const requestIdHeader = ctx.req.headers["x-request-id"];
  const requestId = Array.isArray(requestIdHeader)
    ? requestIdHeader[0]
    : requestIdHeader;

  const result = await securityAccessMonitor.record({
    reason,
    procedurePath,
    sessionChurchId,
    targetChurchId,
    actorChurchUserId:
      ctx.user?.authSource === "church" ? Math.abs(ctx.user.id) : null,
    requestId: requestId ? String(requestId) : null,
    sourceFingerprint,
  });

  await recordSecurityAccessAuditEvent({
    churchId: ownerChurchId,
    event: result.event,
  });
}

const requireTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Sessões próprias de igreja devem permanecer vinculadas ao tenant
  // resolvido pelo contexto. Sessões Manus continuam usando o churchId
  // explícito validado pelos gates legados da própria feature.
  if (
    ctx.user.authSource === "church" &&
    (ctx.tenantMismatch === true ||
      ctx.tenantChurchId === null ||
      ctx.user.churchId !== ctx.tenantChurchId)
  ) {
    try {
      await recordTenantAccessDenied(
        ctx,
        opts.path,
        ctx.tenantMismatch || ctx.user.churchId !== ctx.tenantChurchId
          ? "jwt_host_mismatch"
          : "tenant_scope_mismatch"
      );
    } catch (error) {
      console.warn(
        "[tenant-security-audit] Falha ao persistir bloqueio",
        error instanceof Error ? error.name : "UnknownError"
      );
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "O tenant da sessão não corresponde ao tenant da requisição.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const tenantProcedure = protectedProcedure.use(requireTenant);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
