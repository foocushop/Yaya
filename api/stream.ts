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
    
    const contentType = response.headers.get("content-type") || "";
    if (contentType) res.setHeader("Content-Type", contentType);
    
    const isM3u8 = url.includes('.m3u8') || contentType.includes('mpegurl');

    if (isM3u8) {
      const text = await response.text();
      const baseUrl = new URL(url);
      
      const rewritten = text.split('\n').map((line: string) => {
        if (line.startsWith('#') || line.trim() === '') return line;

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
       const readable = Readable.fromWeb(response.body as any);
       const passThrough = new PassThrough({ highWaterMark: 10 * 1024 * 1024 });
       readable.pipe(passThrough).pipe(res);
    } else {
      res.status(500).send("No body in response");
    }
  } catch (e: any) {
    console.error("Streaming Proxy Error:", e);
    res.status(500).send("Failed to proxy stream");
  }
}
