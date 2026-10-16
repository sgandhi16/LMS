"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize } from "lucide-react";
import { toast } from "sonner";

interface VideoPlayerProps {
  moduleId: string;
  playbackUrl: string | null;
  provider: string; // "LOCAL" | "S3" | "YOUTUBE" | "VIMEO"
  initialWatchedSec?: number;
  initialWatchPercent?: number;
  durationSec?: number | null;
  videoCompleted?: boolean;
  onProgressUpdate?: (data: { watchedSec: number; watchPercent: number; videoCompleted: boolean }) => void;
}

export function VideoPlayer({
  moduleId,
  playbackUrl,
  provider,
  initialWatchedSec = 0,
  initialWatchPercent = 0,
  durationSec = 600,
  videoCompleted = false,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialWatchedSec);
  const [duration, setDuration] = useState(durationSec || 600);
  const [isCompleted, setIsCompleted] = useState(videoCompleted);
  const [isMuted, setIsMuted] = useState(false);
  const lastReportedTimeRef = useRef(initialWatchedSec);
  const isCompletedRef = useRef(videoCompleted);

  const isYouTube =
    provider === "YOUTUBE" ||
    (playbackUrl && (playbackUrl.includes("youtube.com") || playbackUrl.includes("youtu.be")));

  // Extract YouTube ID
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    }
    const startParam = initialWatchedSec > 5 ? `&start=${Math.floor(initialWatchedSec)}` : "";
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0${startParam}`;
  };

  // Report watch progress to server
  const reportProgress = useCallback(
    async (sec: number, totalDur: number) => {
      if (totalDur <= 0) return;
      const percent = Math.min(1.0, sec / totalDur);

      try {
        const res = await fetch("/api/student/progress/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            watchedSec: Math.round(sec * 10) / 10,
            watchPercent: Math.round(percent * 1000) / 1000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const newlyCompleted = data.progress?.videoCompleted ?? false;
          if (newlyCompleted && !isCompletedRef.current) {
            isCompletedRef.current = true;
            setIsCompleted(true);
            toast.success("🎯 Video completed! (≥ 90% watched). Ready for test.");
          }
          onProgressUpdate?.({
            watchedSec: sec,
            watchPercent: percent,
            videoCompleted: isCompletedRef.current,
          });
        }
      } catch (err) {
        console.error("Failed to report video progress:", err);
      }
    },
    [moduleId, onProgressUpdate]
  );

  // Resume playback position on load
  useEffect(() => {
    if (videoRef.current && initialWatchedSec > 5) {
      videoRef.current.currentTime = initialWatchedSec;
      toast.info(`Resumed from ${Math.floor(initialWatchedSec / 60)}m ${Math.floor(initialWatchedSec % 60)}s`);
    }
  }, [initialWatchedSec]);

  // Periodic report every 10 seconds while playing HTML5 video
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const cur = videoRef.current.currentTime;
        const dur = videoRef.current.duration || duration;
        if (Math.abs(cur - lastReportedTimeRef.current) >= 5) {
          lastReportedTimeRef.current = cur;
          reportProgress(cur, dur);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying, duration, reportProgress]);

  // Handle HTML5 video events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration;
    setCurrentTime(cur);

    // Check 90% threshold in real-time
    if (dur > 0 && cur / dur >= 0.9 && !isCompletedRef.current) {
      reportProgress(cur, dur);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
      if (initialWatchedSec > 0) {
        videoRef.current.currentTime = Math.min(initialWatchedSec, videoRef.current.duration - 2);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      reportProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-2xl bg-black">
      {/* Video Completed Banner */}
      {isCompleted && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-md shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>Watched (≥ 90%)</span>
        </div>
      )}

      {isYouTube && playbackUrl ? (
        <div className="relative aspect-video w-full">
          <iframe
            src={getYouTubeEmbedUrl(playbackUrl)}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Training Video"
          />
          {/* Fallback mark watched button for embedded third party players */}
          <div className="absolute bottom-3 left-4 z-20 flex items-center gap-3">
            {!isCompleted && (
              <button
                onClick={() => reportProgress(duration * 0.95, duration)}
                className="px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Video Complete (≥90%)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative aspect-video w-full group">
          <video
            ref={videoRef}
            src={playbackUrl || undefined}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (videoRef.current) {
                reportProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              reportProgress(duration, duration);
            }}
            className="w-full h-full object-cover"
          />

          {/* Custom Overlay Controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
            {/* Scrubber */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-slate-300 font-mono">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-slate-300 font-mono">{formatTime(duration)}</span>
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  {Math.round((currentTime / (duration || 1)) * 100)}% watched
                </span>
                <button
                  onClick={() => videoRef.current?.requestFullscreen()}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
