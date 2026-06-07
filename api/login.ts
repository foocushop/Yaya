import { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(401).json({ error: "Invalid response from IPTV server (not JSON). Please check the server URL." });
      }
      
      if (data.user_info && data.user_info.auth === 1) {
         const token = Buffer.from(JSON.stringify({ serverUrl: baseUrl, username, password })).toString('base64');
         res.json({ token, user: { username, serverUrl: baseUrl } });
      } else {
         res.status(401).json({ error: "Invalid IPTV credentials or expired account." });
      }
    } catch (e: any) {
      console.error("Login Error:", e);
      res.status(500).json({ error: "Could not reach IPTV server. Please check the URL." });
    }
  } else {
    res.status(400).json({ error: "Missing server URL or credentials" });
  }
}
