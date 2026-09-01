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
import { getDerivedLogoIconUrls, getOptimizedMediaUrls, getPwaIconUrls, uploadMedia, type MediaPurpose, type MediaResourceType } from "../media";
import { stripeWebhookHandler } from "../stripe-webhook";
import { verifyToken } from "../auth";
import { matchesTreasuryAttachmentSignature, safeTreasuryAttachmentName, TREASURY_ATTACHMENT_MIME_TYPES } from "../treasury-files";
import {
  createFinancialReconciliationAttachment,
  createMediaAsset,
  createStartupDiagnostic,
  getActiveChurchUserById,
  getActiveMinistryRoleKeysByPerson,
  getComplementaryRolesByChurchUser,
  getFinancialReconciliationById,
  getChurchBySlug,
  getChurchById,
  getEffectivePwaIconUrls,
  getMinistryRoleDefinitionsByChurch,
  isCellStudyAdministrator,
  updateChurchPwaIcon,
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
  const hostname = host?.split(":")[0]?.toLowerCase() ?? "";
  if (["idefazei.com.br", "www.idefazei.com.br", "admin.idefazei.com.br"].includes(hostname)) return null;
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

  const fallbackPwaIcons = { 192: "/ide-fazei-pwa-fallback-192.png", 512: "/ide-fazei-pwa-fallback-512.png" } as const;
  const resolvePwaChurch = async (req: express.Request) => {
    const requestedTenant = typeof req.query.tenant === "string" && /^[a-z0-9-]{2,100}$/.test(req.query.tenant) ? req.query.tenant : null;
    const tenantSlug = requestedTenant || getTenantSlugFromHost(req.headers.host);
    return tenantSlug ? getChurchBySlug(tenantSlug) : null;
  };
  app.get("/manifest.json", async (req, res) => {
    const church = await resolvePwaChurch(req);
    const pwaCacheQuery = church ? `?tenant=${encodeURIComponent(church.slug)}&v=${encodeURIComponent(String(church.updatedAt?.getTime() ?? 0))}` : "";
    res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
    res.type("application/manifest+json").json({
      id: "/",
      name: church ? `${church.name} — Ide Fazei` : "Ide Fazei — Plataforma de Discipulado",
      short_name: church?.name?.slice(0, 12) || "Ide Fazei",
      description: "Plataforma ministerial completa para igrejas que desejam crescer com propósito, precisão e excelência espiritual.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f5f0e8",
      theme_color: church?.primaryColor || "#1e3a5f",
      orientation: "portrait-primary",
      lang: "pt-BR",
      icons: [
        { src: `/api/pwa/icon-192.png${pwaCacheQuery}`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: `/api/pwa/icon-512.png${pwaCacheQuery}`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
      categories: ["productivity", "lifestyle"],
      shortcuts: [
        { name: "Dashboard", short_name: "Dashboard", description: "Visão geral da sua igreja", url: "/app/dashboard", icons: [{ src: `/api/pwa/icon-192.png${pwaCacheQuery}`, sizes: "192x192", type: "image/png" }] },
        { name: "Ganhar Almas", short_name: "Almas", description: "Registrar nova conversão", url: "/app/almas", icons: [{ src: `/api/pwa/icon-192.png${pwaCacheQuery}`, sizes: "192x192", type: "image/png" }] },
        { name: "Funil de Discipulado", short_name: "Funil", description: "Acompanhar o funil de discipulado", url: "/app/funil", icons: [{ src: `/api/pwa/icon-192.png${pwaCacheQuery}`, sizes: "192x192", type: "image/png" }] },
      ],
    });
  });
  app.get("/api/pwa/icon-:size(192|512).png", async (req, res) => {
    const church = await resolvePwaChurch(req);
    const size = req.params.size === "512" ? 512 : 192;
    const fallbackPwaIcon = fallbackPwaIcons[size];
    const effectivePwaIcon = church ? await getEffectivePwaIconUrls(church.id) : null;
    const iconUrl = size === 512 ? (effectivePwaIcon?.icon512Url || effectivePwaIcon?.icon192Url || fallbackPwaIcon) : (effectivePwaIcon?.icon192Url || fallbackPwaIcon);
    res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
    return res.redirect(302, iconUrl);
  });

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
    let originalFilename = "logo";
    let requestedPurpose: "tenant_logo" | "certificate_logo" = "tenant_logo";
    let limitReached = false;
    let invalidMimeType = false;
    const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    bb.on("field", (name, value) => {
      if (name === "purpose" && value === "certificate_logo") requestedPurpose = "certificate_logo";
    });
    bb.on("file", (_field, stream, info) => {
      originalFilename = info.filename || "logo";
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
        const uploaded = await uploadMedia({
          churchId: churchUser.churchId,
          data: fileBuffer,
          mimeType,
          resourceType: "image",
          purpose: requestedPurpose,
          originalFilename,
          uploadedByChurchUserId: churchUser.id,
        });
        const asset = await createMediaAsset({
          churchId: churchUser.churchId,
          provider: uploaded.provider,
          resourceType: uploaded.resourceType,
          purpose: uploaded.purpose,
          publicId: uploaded.publicId,
          storageKey: uploaded.provider === "manus_storage" ? uploaded.key : null,
          url: uploaded.url,
          secureUrl: uploaded.secureUrl,
          originalFilename: uploaded.originalFilename,
          mimeType: uploaded.mimeType,
          bytes: uploaded.bytes,
          width: uploaded.width,
          height: uploaded.height,
          durationSeconds: uploaded.durationSeconds,
          entityType: "church",
          entityId: churchUser.churchId,
          uploadedByChurchUserId: churchUser.id,
        });
        const optimized = getOptimizedMediaUrls(uploaded);
        res.json({ url: uploaded.url, optimizedUrl: optimized.optimizedUrl, webpUrl: optimized.webpUrl, avifUrl: optimized.avifUrl, key: uploaded.key, provider: uploaded.provider, publicId: uploaded.publicId, mediaAssetId: asset?.id ?? null });
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

  // Galeria pública: somente Pastores podem enviar mídia para a página publicada
  // da própria igreja. O tenant vem do JWT, nunca do formulário ou da URL.
  app.post("/api/tenant-public-media", async (req, res) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.type !== "church") return res.status(401).json({ error: "Authentication required" });

    const churchUser = await getActiveChurchUserById(Number(payload.sub));
    const publisherRoles = new Set(["pastor_presidente", "pastor_local"]);
    if (!churchUser || churchUser.churchId !== payload.churchId || churchUser.role !== payload.role || !publisherRoles.has(churchUser.role)) {
      return res.status(403).json({ error: "Only church pastors can upload public gallery media" });
    }
    if (!(req.headers["content-type"] ?? "").includes("multipart/form-data")) return res.status(400).json({ error: "Expected multipart/form-data" });

    const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/png";
    let originalFilename = "gallery-image";
    let invalidMimeType = false;
    let limitReached = false;
    bb.on("file", (_field, stream, info) => {
      originalFilename = info.filename || "gallery-image";
      mimeType = info.mimeType || "image/png";
      if (!allowedMimeTypes.has(mimeType)) { invalidMimeType = true; stream.resume(); return; }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => { limitReached = true; stream.resume(); });
      stream.on("end", () => { if (!limitReached) fileBuffer = Buffer.concat(chunks); });
    });
    bb.on("finish", async () => {
      if (limitReached) return res.status(413).json({ error: "File too large (max 4MB)" });
      if (invalidMimeType) return res.status(415).json({ error: "Only PNG, JPEG and WebP images are allowed" });
      if (!fileBuffer) return res.status(400).json({ error: "No file received" });
      try {
        const uploaded = await uploadMedia({
          churchId: churchUser.churchId,
          data: fileBuffer,
          mimeType,
          resourceType: "image",
          purpose: "tenant_public_gallery",
          originalFilename,
          uploadedByChurchUserId: churchUser.id,
        });
        const asset = await createMediaAsset({
          churchId: churchUser.churchId,
          provider: uploaded.provider,
          resourceType: uploaded.resourceType,
          purpose: uploaded.purpose,
          publicId: uploaded.publicId,
          storageKey: uploaded.provider === "manus_storage" ? uploaded.key : null,
          url: uploaded.url,
          secureUrl: uploaded.secureUrl,
          originalFilename: uploaded.originalFilename,
          mimeType: uploaded.mimeType,
          bytes: uploaded.bytes,
          width: uploaded.width,
          height: uploaded.height,
          durationSeconds: uploaded.durationSeconds,
          entityType: "tenant_public_site",
          entityId: churchUser.churchId,
          uploadedByChurchUserId: churchUser.id,
        });
        const optimized = getOptimizedMediaUrls(uploaded);
        return res.json({ url: uploaded.url, optimizedUrl: optimized.optimizedUrl, webpUrl: optimized.webpUrl, avifUrl: optimized.avifUrl, key: uploaded.key, provider: uploaded.provider, publicId: uploaded.publicId, mediaAssetId: asset?.id ?? null });
      } catch (error) {
        console.error("[Tenant public media] Upload failed:", error);
        return res.status(500).json({ error: "Upload failed" });
      }
    });
    bb.on("error", (error) => { console.error("[Tenant public media] Upload error:", error); res.status(500).json({ error: "Upload error" }); });
    req.pipe(bb);
  });

  // Endpoint genérico de mídia para as próximas áreas do produto. A finalidade e o tipo
  // vêm do formulário, mas o tenant e a autorização vêm exclusivamente da sessão.
  app.post("/api/media/upload", async (req, res) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.type !== "church") return res.status(401).json({ error: "Authentication required" });
    const churchUser = await getActiveChurchUserById(Number(payload.sub));
    if (!churchUser || churchUser.churchId !== payload.churchId || churchUser.role !== payload.role) return res.status(403).json({ error: "Invalid church session" });
    if (!(req.headers["content-type"] ?? "").includes("multipart/form-data")) return res.status(400).json({ error: "Expected multipart/form-data" });

    let purpose: MediaPurpose = "other";
    let resourceType: MediaResourceType = "image";
    let fileBuffer: Buffer | null = null;
    let mimeType = "application/octet-stream";
    let originalFilename = "media";
    let invalidMimeType = false;
    let limitReached = false;
    const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm", "video/quicktime", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"]);
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 32 * 1024 * 1024, files: 1 } });
    bb.on("field", (name, value) => {
      if (name === "purpose" && ["tenant_logo", "tenant_pwa_icon", "tenant_public_gallery", "tenant_public_hero", "certificate_logo", "public_video", "announcement_image", "event_flyer", "cell_study_attachment"].includes(value)) purpose = value as MediaPurpose;
      if (name === "resourceType" && ["image", "video", "raw"].includes(value)) resourceType = value as MediaResourceType;
    });
    bb.on("file", (_field, stream, info) => {
      originalFilename = info.filename || "media";
      mimeType = info.mimeType || "application/octet-stream";
      if (!allowedMimeTypes.has(mimeType)) { invalidMimeType = true; stream.resume(); return; }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => { limitReached = true; stream.resume(); });
      stream.on("end", () => { if (!limitReached) fileBuffer = Buffer.concat(chunks); });
    });
    bb.on("finish", async () => {
      if (limitReached) return res.status(413).json({ error: "Arquivo muito grande (máximo 32 MB)" });
      if (invalidMimeType) return res.status(415).json({ error: "Formato não permitido. Use PDF, DOC, DOCX, PPT, PPTX, PNG, JPEG, WebP, MP3, WAV ou OGG, conforme o material." });
      if (!fileBuffer) return res.status(400).json({ error: "No file received" });
      const pastorRoles = new Set(["pastor_presidente", "pastor_local"]);
      const adminRoles = new Set(["pastor_presidente", "pastor_local", "secretario"]);
      const imagePurposes = new Set<MediaPurpose>(["tenant_logo", "tenant_pwa_icon", "tenant_public_gallery", "tenant_public_hero", "certificate_logo", "announcement_image", "event_flyer"]);
      if (!imagePurposes.has(purpose) && purpose !== "public_video" && purpose !== "cell_study_attachment") return res.status(400).json({ error: "Finalidade de mídia inválida" });
      if (imagePurposes.has(purpose) && resourceType !== "image") return res.status(400).json({ error: "Esta finalidade aceita somente imagens" });
      if (purpose === "public_video" && resourceType !== "video") return res.status(400).json({ error: "Vídeos públicos exigem resourceType=video" });
      if (purpose === "cell_study_attachment" && resourceType !== "raw" && resourceType !== "image") return res.status(400).json({ error: "Anexos de estudos exigem arquivo ou imagem" });
      if (purpose === "tenant_logo" || purpose === "tenant_pwa_icon" || purpose === "certificate_logo") {
        if (!adminRoles.has(churchUser.role)) return res.status(403).json({ error: "Permissão administrativa necessária" });
        if (fileBuffer.length > 2 * 1024 * 1024) return res.status(413).json({ error: "Logo deve ter no máximo 2 MB" });
      }
      if (purpose === "event_flyer") {
        if (!adminRoles.has(churchUser.role)) return res.status(403).json({ error: "Permissão administrativa necessária para enviar o flyer" });
        if (fileBuffer.length > 4 * 1024 * 1024) return res.status(413).json({ error: "O flyer deve ter no máximo 4 MB" });
      }
      if (purpose === "cell_study_attachment") {
        const canUpload = adminRoles.has(churchUser.role) || await isCellStudyAdministrator(churchUser.churchId, churchUser.id);
        if (!canUpload) return res.status(403).json({ error: "Somente responsáveis autorizados podem enviar anexos de estudos" });
        if (fileBuffer.length > 20 * 1024 * 1024) return res.status(413).json({ error: "O anexo deve ter no máximo 20 MB" });
      }
      if (purpose === "tenant_public_gallery" || purpose === "tenant_public_hero" || purpose === "public_video" || purpose === "announcement_image") {
        if (!pastorRoles.has(churchUser.role)) return res.status(403).json({ error: "Somente Pastores podem enviar esta mídia" });
        if (resourceType === "image" && fileBuffer.length > (purpose === "tenant_public_hero" ? 5 : 4) * 1024 * 1024) return res.status(413).json({ error: purpose === "tenant_public_hero" ? "Imagem do Hero deve ter no máximo 5 MB" : "Imagem deve ter no máximo 4 MB" });
      }
      try {
        const uploaded = await uploadMedia({ churchId: churchUser.churchId, data: fileBuffer, mimeType, resourceType, purpose, originalFilename, uploadedByChurchUserId: churchUser.id });
        const asset = await createMediaAsset({ churchId: churchUser.churchId, provider: uploaded.provider, resourceType: uploaded.resourceType, purpose: uploaded.purpose, publicId: uploaded.publicId, storageKey: uploaded.provider === "manus_storage" ? uploaded.key : null, url: uploaded.url, secureUrl: uploaded.secureUrl, originalFilename: uploaded.originalFilename, mimeType: uploaded.mimeType, bytes: uploaded.bytes, width: uploaded.width, height: uploaded.height, durationSeconds: uploaded.durationSeconds, entityType: purpose, entityId: churchUser.churchId, uploadedByChurchUserId: churchUser.id });
        const churchBeforeMediaUpdate = await getChurchById(churchUser.churchId);
        const hasCustomPwaIcon = churchBeforeMediaUpdate?.pwaIconSource === "custom" || churchBeforeMediaUpdate?.pwaIconAssetId !== null;
        const pwaUrls = purpose === "tenant_pwa_icon"
          ? getPwaIconUrls(uploaded)
          : purpose === "tenant_logo" && !hasCustomPwaIcon
            ? getDerivedLogoIconUrls(uploaded, churchBeforeMediaUpdate?.primaryColor)
            : null;
        if (pwaUrls) {
          await updateChurchPwaIcon(churchUser.churchId, {
            assetId: purpose === "tenant_pwa_icon" ? asset?.id ?? null : null,
            ...pwaUrls,
            source: purpose === "tenant_pwa_icon" ? "custom" : "derived",
          });
        }
        const optimized = getOptimizedMediaUrls(uploaded);
        return res.json({ url: uploaded.url, optimizedUrl: optimized.optimizedUrl, webpUrl: optimized.webpUrl, avifUrl: optimized.avifUrl, key: uploaded.key, provider: uploaded.provider, publicId: uploaded.publicId, resourceType: uploaded.resourceType, purpose: uploaded.purpose, mediaAssetId: asset?.id ?? null, icon192Url: pwaUrls?.icon192Url ?? null, icon512Url: pwaUrls?.icon512Url ?? null, pwaIconSource: pwaUrls ? purpose === "tenant_pwa_icon" ? "custom" : "derived" : null });
      } catch (error) {
        console.error("[Media] Upload failed:", error);
        return res.status(500).json({ error: "Upload failed" });
      }
    });
    bb.on("error", (error) => { console.error("[Media] Busboy error:", error); res.status(500).json({ error: "Upload error" }); });
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

    bb.on("field", (name, value) => {
      if (name === "reconciliationId" && /^\d+$/.test(value)) reconciliationId = Number(value);
    });
    bb.on("file", (_field, stream, info) => {
      mimeType = info.mimeType || "application/pdf";
      originalFileName = info.filename || "comprovante";
      if (!TREASURY_ATTACHMENT_MIME_TYPES.has(mimeType)) {
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
      if (!matchesTreasuryAttachmentSignature(fileBuffer, mimeType)) return res.status(415).json({ error: "O conteúdo do arquivo não corresponde ao formato informado." });
      const reconciliation = await getFinancialReconciliationById(reconciliationId, churchUser.churchId);
      if (!reconciliation) return res.status(404).json({ error: "Reconciliation not found" });
      try {
        const safeName = safeTreasuryAttachmentName(originalFileName, mimeType);
        const key = `churches/${churchUser.churchId}/treasury/reconciliations/${reconciliation.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
        const { url } = await storagePut(key, fileBuffer, mimeType);
        const attachment = await createFinancialReconciliationAttachment({
          churchId: churchUser.churchId, reconciliationId: reconciliation.id, fileKey: key, url,
          fileName: safeName, mimeType, sizeBytes: fileBuffer.length, uploadedByChurchUserId: churchUser.id,
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
