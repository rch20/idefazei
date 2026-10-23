import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { buildTenantHtml } from "../tenantPublicMeta";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      const tenantHtml = await buildTenantHtml(page, req.headers.host).catch(() => null);
      res.status(200).set({ "Content-Type": "text/html" }).end(tenantHtml ?? page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Never let a missing hashed module fall through to index.html. Browsers can
  // keep an older entrypoint briefly after a release; returning HTML with 200
  // for a .js request turns a recoverable stale chunk into a syntax error.
  app.use("/assets", express.static(path.join(distPath, "assets")));
  app.use("/assets", (_req, res) => {
    res.status(404).type("text/plain").send("Asset not found");
  });
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist. Em subdomínios de tenant
  // com site publicado, injeta título/descrição/OG da própria igreja (compartilhamento + SEO).
  const indexHtmlPath = path.resolve(distPath, "index.html");
  let indexHtmlCache: string | null = null;
  const readIndexHtml = () => {
    if (indexHtmlCache === null) {
      try {
        indexHtmlCache = fs.readFileSync(indexHtmlPath, "utf-8");
      } catch {
        indexHtmlCache = null;
      }
    }
    return indexHtmlCache;
  };

  app.use("*", async (req, res) => {
    if (req.method === "GET") {
      const baseHtml = readIndexHtml();
      if (baseHtml) {
        try {
          const tenantHtml = await buildTenantHtml(baseHtml, req.headers.host);
          if (tenantHtml) return res.status(200).type("html").send(tenantHtml);
        } catch (error) {
          console.error("[tenantMeta] injection failed:", error);
        }
      }
    }
    return res.sendFile(indexHtmlPath);
  });
}
