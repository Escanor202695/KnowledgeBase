import { Video as VideoIcon, Clock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Video } from "@shared/schema";

interface VideoLibraryProps {
  videos: Video[];
  isLoading: boolean;
}

export function VideoLibrary({ videos, isLoading }: VideoLibraryProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Your Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-32 md:h-40 bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Your Videos</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <VideoIcon className="w-12 h-12 text-muted-foreground opacity-40" />
          <h3 className="text-lg font-medium mt-4">No videos yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
            Import your first YouTube video to start building your knowledge base
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Your Videos</h2>
        <span className="text-xs text-muted-foreground">
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video) => (
          <a
            key={video._id}
            href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid={`link-video-${video._id}`}
          >
            <Card
              className="transition-all duration-200 hover-elevate cursor-pointer"
              data-testid={`card-video-${video._id}`}
            >
              <div className="relative h-32 md:h-40 bg-muted overflow-hidden rounded-t-lg">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                {!video.thumbnail_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium leading-normal line-clamp-2" data-testid={`text-video-title-${video._id}`}>
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {video.channel_name && (
                    <span className="line-clamp-1">{video.channel_name}</span>
                  )}
                  {video.duration && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
