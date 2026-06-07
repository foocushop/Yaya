import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable, PassThrough } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // 1. Auth Login API (Real Xtream Codes validation)
  app.post("/api/login", async (req, res) => {
    const { serverUrl, username, password } = req.body;
    
    if (serverUrl && username && password) {
      try {
        const baseUrl = serverUrl.replace(/\/$/, '');
        const targetUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
            "Accept": "*/*"
          }
        });

        if (!response.ok) {
           return res.status(401).json({ error: "Failed to connect to IPTV server. HTTP status: " + response.status });
        }
        
        const data = await response.json();
        if (data.user_info && data.user_info.auth === 1) {
           // Encode credentials in a token so we can use them to fetch channels later without storing them on our proxy
           const token = Buffer.from(JSON.stringify({ serverUrl: baseUrl, username, password })).toString('base64');
           res.json({ token, user: { username, serverUrl: baseUrl } });
        } else {
           res.status(401).json({ error: "Invalid IPTV credentials or expired account." });
        }
      } catch (e: any) {
        console.error("Login Error:", e);
        res.status(500).json({ error: "Could not reach IPTV server. Please check the URL and ensure it allows cross-origin or server-to-server requests." });
      }
    } else {
      res.status(400).json({ error: "Missing server URL or credentials" });
    }
  });

  // 2. Channels API (Real Xtream Codes Categories & Streams)
  app.get("/api/channels", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.split(" ")[1];
      const { serverUrl, username, password } = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

      const fetchOptions = {
        headers: {
          "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
          "Accept": "*/*"
        }
      };

      // Fetch Categories
      const catUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;
      const catResponse = await fetch(catUrl, fetchOptions);
      const catData = await catResponse.json();
      
      const categoriesMap = new Map();
      if (Array.isArray(catData)) {
          catData.forEach((c: any) => categoriesMap.set(c.category_id, c.category_name));
      }

      // Fetch Streams
      const streamsUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;
      const streamsResponse = await fetch(streamsUrl, fetchOptions);
      const streamsData = await streamsResponse.json();

      if (!Array.isArray(streamsData)) {
         return res.json({ channels: [] });
      }

      const channels = streamsData.map((stream: any) => {
         const catName = categoriesMap.get(stream.category_id) || "Uncategorized";
         // We construct the HLS format URL for Xtream Codes dynamically
         const rawStreamUrl = `${serverUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`;
         
         return {
            id: String(stream.stream_id),
            name: stream.name || `Channel ${stream.stream_id}`,
            logo: stream.stream_icon || "",
            category: catName,
            streamUrl: rawStreamUrl
         };
      });

      res.json({ channels });
    } catch (e: any) {
      console.error("Channels Fetch Error:", e);
      res.status(500).json({ error: "Failed to fetch channels from IPTV server." });
    }
  });

  // 4. Serverless-like Proxy for buffer/CORS bypass
  app.get("/api/stream", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      res.status(400).send("Missing source url");
      return;
    }

    try {
      // Act as a buffer/proxy to bypass CORS and stabilize stream
      const response = await fetch(url, {
        headers: {
          "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
          "Accept": "*/*",
          "Connection": "keep-alive"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch original stream: ${response.status}`);
      }
      
      // Pass along the content headers
      const contentType = response.headers.get("content-type") || "";
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const isM3u8 = url.includes('.m3u8') || contentType.includes('mpegurl');

      if (isM3u8) {
        // text stream rewrite
        const text = await response.text();
        const baseUrl = new URL(url);
        
        const rewritten = text.split('\n').map(line => {
          if (line.startsWith('#') || line.trim() === '') return line;

          // Some lines could be segment URIs
          let itemUrl;
          if (line.startsWith('http')) {
            itemUrl = line;
          } else {
            itemUrl = new URL(line, baseUrl).toString();
          }
          
          return `/api/stream?url=${encodeURIComponent(itemUrl)}`;
        }).join('\n');
        
        res.send(rewritten);
      } else if (response.body) {
         // Transform web stream to node readable
         const readable = Readable.fromWeb(response.body as any);
         // Utilisation d'un buffer mémoire côté serveur optimisé (10MB) pour les environnements de type Vercel (fonctions Serverless)
         // Le serveur Vercel/Node téléchargera le segment dans la RAM pour une transmission fluide au client.
         const passThrough = new PassThrough({ highWaterMark: 10 * 1024 * 1024 });
         readable.pipe(passThrough).pipe(res);
      } else {
        res.status(500).send("No body in response");
      }
    } catch (e) {
      console.error("Streaming Proxy Error:", e);
      res.status(500).send("Failed to proxy stream");
    }
  });

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
