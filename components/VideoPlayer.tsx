import React, { useRef, useEffect } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import Hls from 'hls.js'; // Import hls.js

interface VideoPlayerProps {
  url: string;
  title: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // HLS.js for .m3u8 streams
  useEffect(() => {
    if (videoRef.current && url.endsWith('.m3u8')) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.error("Error playing HLS video:", e));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error("HLS error:", data);
            // Attempt to recover from certain errors
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        hls.destroy();
                        break;
                }
            }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari, iOS)
        video.src = url;
        video.play().catch(e => console.error("Error playing native HLS video:", e));
      } else {
        console.error('HLS is not supported in this browser.');
      }
      return () => {
        if (Hls.isSupported()) {
          (video as any).hls?.destroy(); // Clean up Hls.js instance
        }
      };
    }
  }, [url]);


  // 1. YouTube Handler
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYoutubeId(url);

  if (youtubeId) {
    return (
      <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. Telegram Embed Handler
  if (url.includes('t.me/')) {
      // Ensure we use the embed mode
      // Convert https://t.me/c/123/456 -> https://t.me/c/123/456?embed=1
      // Handle post links: t.me/channel/123
      
      let embedUrl = url;
      if (!url.includes('?embed=1')) {
          embedUrl = `${url}?embed=1`;
      }
      
      return (
        <div className="relative w-full flex justify-center bg-black/5 rounded-xl overflow-hidden border border-slate-200/50 p-2 md:p-4 transition-all hover:bg-black/10">
             <iframe 
                src={embedUrl} 
                className="w-full min-h-[500px] border-none overflow-hidden rounded-lg bg-white"
                title="Telegram Content"
             />
             <div className="absolute top-2 right-2 text-[10px] text-gray-500 bg-white/90 px-2 rounded border border-gray-200 shadow-sm flex items-center">
                 <ExternalLink className="h-3 w-3 mr-1" /> Telegram
             </div>
        </div>
      );
  }

  // 3. Direct Video File Handler (.mp4, .webm, .ogg, .mov, .m3u8)
  const isDirectVideoFile = url.match(/\.(mp4|webm|ogg|mov)$/i);
  const isHlsStream = url.endsWith('.m3u8');

  if (isDirectVideoFile || isHlsStream) {
    return (
        <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 group">
        <video 
            ref={videoRef} // Attach ref for HLS.js
            className="w-full h-auto max-h-[600px]"
            controls 
            controlsList="nodownload" // Hint to browser to hide download button
            onContextMenu={(e) => e.preventDefault()} // Disable right click menu
            preload="metadata"
        >
            <source src={url} type={isHlsStream ? 'application/x-mpegURL' : undefined} />
            Your browser does not support the video tag.
        </video>
        </div>
    );
  }

  // 4. Fallback Generic Iframe (for other embeddable players)
  return (
    <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={url}
            title={title}
            frameBorder="0"
            allowFullScreen
        />
        <div className="absolute bottom-0 left-0 w-full bg-yellow-900/90 text-yellow-100 text-xs p-2 text-center">
             <AlertCircle className="h-3 w-3 inline mr-1" />
             External Link Mode
        </div>
    </div>
  );
};