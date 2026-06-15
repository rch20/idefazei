import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { dailyNotificationsHandler } from "../scheduledNotifications";
import Busboy from "busboy";
import { storagePut } from "../storage";
import { stripeWebhookHandler } from "../stripe-webhook";

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

  // Upload de imagens (logo da igreja, etc.)
  app.post("/api/upload", (req, res) => {
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ error: "Expected multipart/form-data" });
      return;
    }
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 2 * 1024 * 1024 } });
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/png";
    let fileName = "upload";
    let limitReached = false;

    bb.on("file", (_field, stream, info) => {
      mimeType = info.mimeType || "image/png";
      fileName = info.filename || "upload";
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
      if (!fileBuffer) {
        res.status(400).json({ error: "No file received" });
        return;
      }
      try {
        const ext = fileName.split(".").pop() ?? "png";
        const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
