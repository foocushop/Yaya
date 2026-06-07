import { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
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
    const catText = await catResponse.text();
    let catData: any[] = [];
    try { catData = JSON.parse(catText); } catch(e) {}
    
    const categoriesMap = new Map();
    if (Array.isArray(catData)) {
        catData.forEach((c: any) => categoriesMap.set(c.category_id, c.category_name));
    }

    // Fetch Streams
    const streamsUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;
    const streamsResponse = await fetch(streamsUrl, fetchOptions);
    const streamsText = await streamsResponse.text();
    let streamsData: any[] = [];
    try { streamsData = JSON.parse(streamsText); } catch(e) {}

    if (!Array.isArray(streamsData)) {
       return res.json({ channels: [] });
    }

    const channels = streamsData.map((stream: any) => {
       const catName = categoriesMap.get(stream.category_id) || "Uncategorized";
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
}
