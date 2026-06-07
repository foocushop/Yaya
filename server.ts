import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import loginHandler from "./api/login";
import channelsHandler from "./api/channels";
import streamHandler from "./api/stream";

// Ignorer les erreurs "self-signed certificate" qui sont courantes sur les serveurs IPTV
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes (Delegated to Vercel-compatible handlers)
  app.post("/api/login", loginHandler);
  app.get("/api/channels", channelsHandler);
  app.get("/api/stream", streamHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server proxy buffering on port ${PORT}`);
  });
}

startServer();
