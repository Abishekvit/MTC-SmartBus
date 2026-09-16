import express from "express";
import path from "path";
import fs from "fs";
import apiApp from "./artifacts/api-server/src/app";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount backend API routes first
  app.use(apiApp);

  const distPath = path.resolve(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.resolve(distPath, "index.html"));

  // Vite middleware for development (if in dev and dist not requested)
  if (process.env.NODE_ENV !== "production" && !process.env.SERVE_DIST) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        configFile: path.resolve(process.cwd(), "artifacts/mtc-smartbus/vite.config.ts"),
        server: {
          middlewareMode: true,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite dev server failed to initialize, falling back to static dist:", e);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get("*", (_req, res) => {
          res.sendFile(path.resolve(distPath, "index.html"));
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
