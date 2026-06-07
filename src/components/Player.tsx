import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Channel } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';

export function Player({ channel }: { channel: Channel | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!channel || !videoRef.current) return;

    setLoading(true);
    setError('');

    const video = videoRef.current;
    // We proxy the M3U8 string via our serverless API to buffer/stabilize.
    const proxiedUrl = `/api/stream?url=${encodeURIComponent(channel.streamUrl)}`;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        // Minimal client buffer: Le serveur prend en charge le buffering
        maxBufferLength: 2,
        maxMaxBufferLength: 5,
        maxBufferSize: 5 * 1000 * 1000, // 5 MB client side, le reste est sur le serveur
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        enableWorker: true,
        startLevel: -1 // auto
      });

      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(e => console.warn("Auto-play prevented", e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error: Retrying stream connection...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error: Recovering stream...');
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              setError('Fatal stream error. Please try another channel.');
              setLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari native HLS support
      video.src = proxiedUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        video.play();
      });
      video.addEventListener('error', () => {
        setError('Playback error. Stream unavailable.');
        setLoading(false);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [channel]);

  if (!channel) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/90">
        <div className="text-slate-500 flex flex-col items-center">
          <TvScreenIcon className="w-16 h-16 mb-4 opacity-50" />
          <p>Select a channel to start watching</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      
      {error && (
        <div className="absolute inset-x-0 bottom-16 mx-auto w-max px-4 py-2 bg-red-900/80 text-white flex items-center gap-2 rounded-lg z-20 shadow-lg border border-red-500/50">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Buffering Stream...</p>
        </div>
      )}

      <video 
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        style={{ objectFit: 'contain' }}
      />
      
      {/* OSD Overlay Info (Fades out typically, but we'll show on top for TV-like feel) */}
      <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex items-start justify-between z-10 transition-opacity">
        <div className="flex items-center gap-4 drop-shadow-md">
          {channel.logo ? (
             <img src={channel.logo} alt={channel.name} className="w-12 h-12 rounded object-cover bg-slate-900 shadow-xl" />
          ) : null}
          <div>
            <h2 className="text-xl font-semibold text-white">{channel.name}</h2>
            <span className="text-xs px-2 py-0.5 bg-blue-600/80 text-blue-100 rounded-sm uppercase tracking-wider">
              {channel.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TvScreenIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
      <polyline points="17 2 12 7 7 2"/>
    </svg>
  );
}
