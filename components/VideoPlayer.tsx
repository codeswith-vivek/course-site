import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react'; 
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  title: string;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, autoPlay = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Internal logic state only
  const [isLoadingVideo, setIsLoadingVideo] = useState(autoPlay); 

  // 1. YouTube Handler
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYoutubeId(url);

  // HLS.js for .m3u8 streams
  useEffect(() => {
    if (autoPlay && videoRef.current && url.includes('.m3u8')) {
      const video = videoRef.current;
      setIsLoadingVideo(true);

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().then(() => setIsLoadingVideo(false)).catch(e => {
            console.error("Error playing HLS video:", e);
            setIsLoadingVideo(false);
          });
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
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
        video.src = url;
        video.play().then(() => setIsLoadingVideo(false)).catch(e => {
          console.error("Error playing native HLS video:", e);
          setIsLoadingVideo(false);
        });
      }
      return () => {
        if (Hls.isSupported()) {
          (video as any).hls?.destroy();
        }
      };
    }
  }, [url, autoPlay]);

  const renderPlayerContent = () => {
    if (youtubeId) {
      return (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${autoPlay ? 1 : 0}&modestbranding=1&rel=0`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (url.includes('t.me/')) {
        let embedUrl = url;
        if (!url.includes('?embed=1')) {
            embedUrl = `${url}?embed=1`;
        }
        return (
            <>
                <iframe
                    src={embedUrl}
                    className="w-full min-h-[500px] border-none overflow-hidden rounded-lg bg-white"
                    title="Telegram Content"
                    allow="autoplay"
                />
                <div className="absolute top-2 right-2 text-[10px] text-gray-500 bg-white/90 px-2 rounded border border-gray-200 shadow-sm flex items-center">
                    <ExternalLink className="h-3 w-3 mr-1" /> Telegram
                </div>
            </>
        );
    }

    // UPDATED REGEX: Supports Firebase Storage URLs (which have query params like ?alt=media)
    const isDirectVideoFile = url.match(/\.(mp4|webm|ogg|mov)(?:\?|$|#)/i);
    const isHlsStream = url.includes('.m3u8');

    if (isDirectVideoFile || isHlsStream) {
      return (
          <video
              ref={videoRef}
              className="w-full h-full rounded-xl" 
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              preload="metadata"
              autoPlay={autoPlay}
          >
              <source src={url} type={isHlsStream ? 'application/x-mpegURL' : undefined} />
              Your browser does not support the video tag.
          </video>
      );
    }

    // Fallback Generic Iframe for other HTTP links
    const isGenericLink = url.startsWith('http') && !url.match(/\.(pdf|zip|rar|doc|docx|xls|xlsx|ppt|pptx)(?:\?|$|#)/i);
    if (isGenericLink) {
        return (
        <>
            <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={url}
                title={title}
                frameBorder="0"
                allowFullScreen
                allow="autoplay"
            />
            <div className="absolute bottom-0 left-0 w-full bg-yellow-900/90 text-yellow-100 text-xs p-2 text-center">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                External Link Mode
            </div>
        </>
        );
    }

    return (
        <div className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center text-white p-4">
            <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
            <h3 className="text-xl font-bold mb-2">Unsupported Media Type</h3>
            <p className="text-sm text-center">Cannot play this resource directly. URL: {url}</p>
        </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10"> 
      {renderPlayerContent()}
    </div>
  );
};