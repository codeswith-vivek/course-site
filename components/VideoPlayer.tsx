import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, PlayCircle, Loader } from 'lucide-react'; // Added Loader
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  title: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false); // New state for loading indicator

  // 1. YouTube Handler
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Move youtubeId declaration here so it's available for all useEffects
  const youtubeId = getYoutubeId(url);

  // HLS.js for .m3u8 streams
  useEffect(() => {
    if (isPlaying && videoRef.current && url.endsWith('.m3u8')) {
      const video = videoRef.current;
      setIsLoadingVideo(true); // Start loading for HLS

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
            console.error("HLS error:", data);
            setIsLoadingVideo(false); // Stop loading on error
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
      } else {
        console.error('HLS is not supported in this browser.');
        setIsLoadingVideo(false);
      }
      return () => {
        if (Hls.isSupported()) {
          (video as any).hls?.destroy();
        }
      };
    }
  }, [url, isPlaying]);

  // Handle iframe loading for YouTube and Telegram (simulated)
  useEffect(() => {
    if (isPlaying && (youtubeId || url.includes('t.me/')) && isLoadingVideo) {
      // Simulate loading for iframes as there's no direct 'loadeddata' event
      const timer = setTimeout(() => {
        setIsLoadingVideo(false);
      }, 1500); // 1.5 seconds simulated loading time
      return () => clearTimeout(timer);
    }
  }, [isPlaying, youtubeId, url, isLoadingVideo]);


  const handlePlayClick = () => {
    setIsPlaying(true);
    setIsLoadingVideo(true); // Start loading when play is clicked
  };

  const renderPlayerContent = () => {
    if (youtubeId) {
      return (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0`}
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

    const isDirectVideoFile = url.match(/\.(mp4|webm|ogg|mov)$/i);
    const isHlsStream = url.endsWith('.m3u8');

    if (isDirectVideoFile || isHlsStream) {
      return (
          <video
              ref={videoRef}
              className="w-full h-auto max-h-[600px] rounded-xl" // Added rounded-xl
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              preload="metadata"
              autoPlay
              onLoadedData={() => setIsLoadingVideo(false)} // Stop loading once data is available
              onError={() => setIsLoadingVideo(false)} // Stop loading on error
          >
              <source src={url} type={isHlsStream ? 'application/x-mpegURL' : undefined} />
              Your browser does not support the video tag.
          </video>
      );
    }

    // Fallback Generic Iframe
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
  };

  return (
    <div className="relative w-full pt-[56.25%] bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 group"> {/* Improved styling here */}
      {!isPlaying ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer" onClick={handlePlayClick}>
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`} // Try to get YouTube thumbnail
            alt={`Play ${title}`}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} // Hide if no thumbnail
          />
          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <PlayCircle className="h-12 w-12 text-white opacity-90 group-hover:opacity-100 transform group-hover:scale-110 transition-transform duration-300" /> {/* Smaller play button */}
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white text-lg font-bold bg-black/50 p-2 rounded text-center truncate">
            {title}
          </div>
        </div>
      ) : (
        isLoadingVideo ? (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white text-xl font-bold">
            <Loader className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
            Loading Video...
          </div>
        ) : (
          renderPlayerContent()
        )
      )}
    </div>
  );
};