import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createHash } from "crypto";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { dailyNotificationsHandler } from "../scheduledNotifications";
import { scheduleRemindersHandler } from "../scheduleReminders";
import Busboy from "busboy";
import { storagePut } from "../storage";
import { stripeWebhookHandler } from "../stripe-webhook";
import { verifyToken } from "../auth";
import {
  createFinancialReconciliationAttachment,
  createStartupDiagnostic,
  getActiveChurchUserById,
  getActiveMinistryRoleKeysByPerson,
  getComplementaryRolesByChurchUser,
  getFinancialReconciliationById,
  getChurchBySlug,
  getMinistryRoleDefinitionsByChurch,
} from "../db";

const STARTUP_DIAGNOSTIC_INTERVAL_MS = 60_000;
const startupDiagnosticRateLimit = new Map<string, number>();
const STARTUP_DIAGNOSTIC_KINDS = new Set(["error", "unhandled_rejection", "resource_load", "startup_timeout", "recovery"]);

function sanitizeDiagnosticText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/https?:\/\/[^\s]+/gi, "[url-removida]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email-removido]")
    .replace(/bearer\s+[\w.-]+/gi, "[token-removido]")
    .trim()
    .slice(0, maxLength);
}

function getTenantSlugFromHost(host: string | undefined) {
  const hostname = host?.split(":")[0] ?? "";
  const parts = hostname.split(".");
  return parts.length >= 3 && !["www", "admin"].includes(parts[0]) ? parts[0] : null;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ⚠️ Stripe webhook MUST be registered BEFORE express.json() to preserve raw body
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Scheduled heartbeat endpoints
  app.post("/api/scheduled/daily-notifications", dailyNotificationsHandler);
  app.post("/api/scheduled/schedule-reminders", scheduleRemindersHandler);

  // Diagnósticos de bootstrap: endpoint público e limitado, sem dados de conta,
  // tokens, conteúdo de formulário ou IP persistido.
  app.post("/api/diagnostics/startup", async (req, res) => {
    try {
      const raw = (req.body ?? {}) as Record<string, unknown>;
      const kind = String(raw.kind ?? "");
      if (!STARTUP_DIAGNOSTIC_KINDS.has(kind)) return res.status(400).json({ error: "invalid-diagnostic-kind" });
      const clientId = sanitizeDiagnosticText(raw.clientId, 80);
      const rateKey = clientId || `anonymous:${req.ip}`;
      const now = Date.now();
      const previous = startupDiagnosticRateLimit.get(rateKey) ?? 0;
      if (now - previous < STARTUP_DIAGNOSTIC_INTERVAL_MS) return res.status(202).json({ accepted: true, throttled: true });
      startupDiagnosticRateLimit.set(rateKey, now);
      if (startupDiagnosticRateLimit.size > 2_000) startupDiagnosticRateLimit.clear();

      const message = sanitizeDiagnosticText(raw.message, 500) || "Falha de inicialização sem mensagem disponível";
      const path = sanitizeDiagnosticText(raw.path, 255).replace(/\?.*$/, "") || "/";
      const userAgent = sanitizeDiagnosticText(raw.userAgent, 500) || "indisponível";
      const tenantSlug = getTenantSlugFromHost(req.headers.host);
      const church = tenantSlug ? await getChurchBySlug(tenantSlug) : null;
      const fingerprint = createHash("sha256").update(`${kind}|${message}|${path}`).digest("hex").slice(0, 64);
      await createStartupDiagnostic({
        churchId: church?.id ?? null,
        kind: kind as "error" | "unhandled_rejection" | "resource_load" | "startup_timeout" | "recovery",
        message,
        fingerprint,
        path,
        userAgent,
        platform: sanitizeDiagnosticText(raw.platform, 120) || null,
        appVersion: sanitizeDiagnosticText(raw.appVersion, 80) || null,
        clientId: clientId || null,
      });
      return res.status(202).json({ accepted: true });
    } catch (error) {
      console.warn("[startup-diagnostics] Falha ao registrar diagnóstico:", error);
      return res.status(202).json({ accepted: false });
    }
  });

  // Upload de logos da igreja: somente perfis administrativos autenticados.
  app.post("/api/upload", async (req, res) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;

    if (!payload || payload.type !== "church") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const churchUser = await getActiveChurchUserById(Number(payload.sub));
    const allowedRoles = new Set(["pastor_presidente", "pastor_local", "secretario"]);
    if (
      !churchUser ||
      churchUser.churchId !== payload.churchId ||
      churchUser.role !== payload.role ||
      !allowedRoles.has(churchUser.role)
    ) {
      res.status(403).json({ error: "You do not have permission to upload a logo" });
      return;
    }

    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ error: "Expected multipart/form-data" });
      return;
    }
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 2 * 1024 * 1024 } });
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/png";
    let limitReached = false;
    let invalidMimeType = false;
    const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    const extensions: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };

    bb.on("file", (_field, stream, info) => {
      mimeType = info.mimeType || "image/png";
      if (!allowedMimeTypes.has(mimeType)) {
        invalidMimeType = true;
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => { limitReached = true; stream.resume(); });
      stream.on("end", () => { if (!limitReached) fileBuffer = Buffer.concat(chunks); });
    });

    bb.on("finish", async () => {
      if (limitReached) {
        res.status(413).json({ error: "File too large (max 2MB)" });
        return;
      }
      if (invalidMimeType) {
        res.status(415).json({ error: "Only PNG, JPEG and WebP images are allowed" });
        return;
      }
      if (!fileBuffer) {
        res.status(400).json({ error: "No file received" });
        return;
      }
      try {
        const ext = extensions[mimeType] ?? "png";
        const key = `churches/${churchUser.churchId}/logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, fileBuffer, mimeType);
        res.json({ url, key });
      } catch (err) {
        console.error("[Upload] Error:", err);
        res.status(500).json({ error: "Upload failed" });
      }
    });

    bb.on("error", (err) => {
      console.error("[Upload] Busboy error:", err);
      res.status(500).json({ error: "Upload error" });
    });

    req.pipe(bb);
  });

  // Comprovantes financeiros: apenas perfis de Tesouraria no tenant autenticado.
  app.post("/api/treasury/reconciliation-attachments", async (req, res) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.type !== "church") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const churchUser = await getActiveChurchUserById(Number(payload.sub));
    if (!churchUser || churchUser.churchId !== payload.churchId || churchUser.role !== payload.role) {
      res.status(403).json({ error: "Invalid church session" });
      return;
    }
    const [complementaryRoles, ministryRoleKeys, definitions] = await Promise.all([
      getComplementaryRolesByChurchUser(churchUser.id, churchUser.churchId),
      churchUser.personId ? getActiveMinistryRoleKeysByPerson(churchUser.personId, churchUser.churchId) : Promise.resolve([]),
      getMinistryRoleDefinitionsByChurch(churchUser.churchId),
    ]);
    const hasCustomTreasuryPermission = definitions.some((definition) => definition.permissionPackage === "treasurer" && ministryRoleKeys.includes(definition.key));
    const hasTreasuryPermission = [churchUser.role, ...complementaryRoles].some((role) => ["pastor_presidente", "pastor_local", "tesoureiro"].includes(role)) || hasCustomTreasuryPermission;
    if (!hasTreasuryPermission) {
      res.status(403).json({ error: "Treasury permission required" });
      return;
    }

    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ error: "Expected multipart/form-data" });
      return;
    }
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
    let reconciliationId: number | null = null;
    let fileBuffer: Buffer | null = null;
    let mimeType = "application/pdf";
    let originalFileName = "comprovante";
    let limitReached = false;
    let invalidMimeType = false;
    const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
    const extensions: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

    bb.on("field", (name, value) => {
      if (name === "reconciliationId" && /^\d+$/.test(value)) reconciliationId = Number(value);
    });
    bb.on("file", (_field, stream, info) => {
      mimeType = info.mimeType || "application/pdf";
      originalFileName = info.filename || "comprovante";
      if (!allowedMimeTypes.has(mimeType)) {
        invalidMimeType = true;
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => { limitReached = true; stream.resume(); });
      stream.on("end", () => { if (!limitReached) fileBuffer = Buffer.concat(chunks); });
    });

    bb.on("finish", async () => {
      if (!reconciliationId) return res.status(400).json({ error: "Reconciliation is required" });
      if (limitReached) return res.status(413).json({ error: "File too large (max 8MB)" });
      if (invalidMimeType) return res.status(415).json({ error: "Only PDF, PNG, JPEG and WebP files are allowed" });
      if (!fileBuffer) return res.status(400).json({ error: "No file received" });
      const reconciliation = await getFinancialReconciliationById(reconciliationId, churchUser.churchId);
      if (!reconciliation) return res.status(404).json({ error: "Reconciliation not found" });
      try {
        const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "comprovante";
        const key = `churches/${churchUser.churchId}/treasury/reconciliations/${reconciliation.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${extensions[mimeType]}`;
        const { url } = await storagePut(key, fileBuffer, mimeType);
        const attachment = await createFinancialReconciliationAttachment({
          churchId: churchUser.churchId, reconciliationId: reconciliation.id, fileKey: key, url,
          fileName: originalFileName.slice(0, 255), mimeType, sizeBytes: fileBuffer.length, uploadedByChurchUserId: churchUser.id,
        });
        return res.json({ attachment });
      } catch (error) {
        console.error("[TreasuryAttachment] Error:", error);
        return res.status(500).json({ error: "Upload failed" });
      }
    });
    bb.on("error", (error) => {
      console.error("[TreasuryAttachment] Busboy error:", error);
      res.status(500).json({ error: "Upload error" });
    });
    req.pipe(bb);
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
