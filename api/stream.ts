import { Request, Response } from "express";
import { Readable, PassThrough } from "stream";

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).send("Missing source url");
    return;
  }

  try {
    const userAgent = "VLC/3.0.18 LibVLC/3.0.18"; // Fix 403: Always pretend to be VLC to IPTV servers
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "*/*",
        "Connection": "keep-alive"
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
         console.error("403 Forbidden from IPTV Proxy. URL was:", url);
      }
      throw new Error(`Failed to fetch original stream: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    const isM3u8 = url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');

    if (isM3u8) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      const text = await response.text();
      const baseUrl = new URL(url);
      
      const rewritten = text.split('\n').map((line: string) => {
        if (line.startsWith('#') || line.trim() === '') return line;

        let itemUrl = line;
        if (!line.startsWith('http')) {
          itemUrl = new URL(line, baseUrl).toString();
        }
        
        // Re-proxy all segments to bypass CORS and User-Agent blocking on the client browser
        return `/api/stream?url=${encodeURIComponent(itemUrl)}`;
      }).join('\n');
      
      res.status(200).send(rewritten);
    } else if (response.body) {
       if (contentType) res.setHeader("Content-Type", contentType);
       const readable = Readable.fromWeb(response.body as any);
       const passThrough = new PassThrough({ highWaterMark: 10 * 1024 * 1024 });
       
       readable.on('error', (err) => console.error("Source Readable error:", err));
       passThrough.on('error', (err) => console.error("PassThrough error:", err));

       readable.pipe(passThrough).pipe(res);
       
       req.on('close', () => {
          readable.destroy();
          passThrough.destroy();
       });
    } else {
      res.status(500).send("No body in response");
    }
  } catch (e: any) {
    console.error("Streaming Proxy Error:", e);
    res.status(500).send("Failed to proxy stream");
  }
}
