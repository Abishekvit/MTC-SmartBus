import express from "express";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import apiApp from "./artifacts/api-server/src/app";

const nodeRequire =
  typeof require !== "undefined"
    ? require
    : createRequire(import.meta.url || "file://" + process.cwd() + "/server.ts");

// Load .env automatically if present
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if .env is missing or already set in environment
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Mount backend API routes first
  app.use(apiApp);

  const distPath = path.resolve(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.resolve(distPath, "index.html"));

  // Vite middleware for development (if in dev and dist not requested)
  if (process.env.NODE_ENV !== "production" && !process.env.SERVE_DIST) {
    try {
      const vitePath = nodeRequire.resolve("vite", {
        paths: [path.resolve(process.cwd(), "artifacts/mtc-smartbus")],
      });
      const { createServer: createViteServer } = await import(vitePath);
      const vite = await createViteServer({
        configFile: path.resolve(process.cwd(), "artifacts/mtc-smartbus/vite.config.ts"),
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite dev server failed to initialize, falling back to static dist:", e);
      if (hasDist) {
        app.use(express.static(distPath));
        app.use((_req, res) => {
          res.sendFile(path.resolve(distPath, "index.html"));
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
