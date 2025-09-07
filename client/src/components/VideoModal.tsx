import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import type { File } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface VideoModalProps {
  file: File;
  open: boolean;
  onClose: () => void;
}

export default function VideoModal({ file, open, onClose }: VideoModalProps) {
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [quality, setQuality] = useState("1080p");
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const { data: subtitles = [] } = useQuery<Array<{ path: string; name: string; language: string }>>({
    queryKey: ["/api/files", file.id, "subtitles"],
    enabled: open && file.type === "video",
  });

  // Get video progress
  const { data: progress } = useQuery<{
    currentTime: number;
    duration: number;
    isWatched: boolean;
  }>({
    queryKey: [`/api/video-progress/${file.id}`],
    enabled: open && file.type === "video",
  });

  // Save video progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async (progressData: { currentTime: number; duration: number; isWatched: boolean }) => {
      const response = await fetch(`/api/video-progress/${file.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(progressData),
      });
      if (!response.ok) throw new Error("Failed to save progress");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/video-progress/${file.id}`] });
    },
  });

  // Load saved progress when video is loaded
  useEffect(() => {
    if (open && videoRef.current && progress?.currentTime) {
      videoRef.current.currentTime = progress.currentTime;
    }
  }, [open, progress]);

  // Save progress periodically while playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;

    const saveProgress = () => {
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }

      progressSaveTimer.current = setTimeout(() => {
        const currentTime = Math.floor(video.currentTime);
        const duration = Math.floor(video.duration || 0);
        const isWatched = currentTime > duration * 0.9; // Mark as watched if >90% viewed

        saveProgressMutation.mutate({
          currentTime,
          duration,
          isWatched,
        });
      }, 2000); // Save after 2 seconds of inactivity
    };

    const handleTimeUpdate = () => {
      saveProgress();
    };

    const handleEnded = () => {
      const duration = Math.floor(video.duration || 0);
      saveProgressMutation.mutate({
        currentTime: duration,
        duration,
        isWatched: true,
      });
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }
    };
  }, [open, saveProgressMutation]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getBreadcrumbPath = () => {
    const pathParts = file.path.split('/');
    return pathParts.slice(0, -1).join('/');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-xl max-h-screen w-screen h-screen p-0 bg-black border-none">
        <div className="h-full flex flex-col">
          {/* Video Player Header */}
          <div className="bg-black/80 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                data-testid="button-close-video"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:text-gray-300 hover:bg-white/10"
              >
                <i className="fas fa-arrow-left text-lg"></i>
              </Button>
              <div>
                <h2 data-testid="text-video-title" className="text-white text-lg font-semibold">{file.name}</h2>
                <p data-testid="text-video-path" className="text-gray-400 text-sm">{getBreadcrumbPath()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Subtitle Toggle */}
              {subtitles.length > 0 && (
                <Button
                  data-testid="button-toggle-subtitles"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                >
                  <i className="fas fa-closed-captioning mr-2"></i>
                  Subtitles
                </Button>
              )}
              {/* Quality Selector */}
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger data-testid="select-video-quality" className="bg-white/20 text-white border-white/30 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="480p">480p</SelectItem>
                </SelectContent>
              </Select>
              <Button
                data-testid="button-close-modal"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:text-gray-300 hover:bg-white/10"
              >
                <i className="fas fa-times text-lg"></i>
              </Button>
            </div>
          </div>

          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden relative">
              {/* Progress indicator */}
              {progress?.isWatched && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-10">
                  ✓ Watched
                </div>
              )}
              {progress?.currentTime > 0 && !progress?.isWatched && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-10">
                  {Math.round((progress.currentTime / (progress.duration || 1)) * 100)}% watched
                </div>
              )}
              <video
                ref={videoRef}
                data-testid="video-element"
                controls
                className="w-full h-full"
                src={`/api/files/${file.id}/stream`}
                poster={file.thumbnailPath ? `/api/thumbnails/${file.thumbnailPath}` : undefined}
              >
                {showSubtitles && subtitles.map((subtitle, index) => (
                  <track
                    key={index}
                    kind="subtitles"
                    src={`/api/subtitles/${subtitle.path}`}
                    srcLang={subtitle.language}
                    label={subtitle.language}
                    default={index === 0}
                  />
                ))}
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Video Controls and Info */}
          <div className="bg-black/80 p-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-white text-sm">
                    <span data-testid="text-current-time">0:00</span> / 
                    <span data-testid="text-total-duration" className="ml-1">{formatDuration(file.duration)}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {(file.size / (1024 * 1024 * 1024)).toFixed(1)} GB • {file.width}×{file.height}
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <i className="fas fa-step-backward"></i>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <i className="fas fa-play"></i>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <i className="fas fa-step-forward"></i>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <i className="fas fa-volume-up"></i>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <i className="fas fa-expand"></i>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
