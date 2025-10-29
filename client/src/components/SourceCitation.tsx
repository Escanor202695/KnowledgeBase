import { Play, ExternalLink } from "lucide-react";
import type { Source } from "@shared/schema";

interface SourceCitationProps {
  source: Source;
}

export function SourceCitation({ source }: SourceCitationProps) {
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getYoutubeUrl = () => {
    return `https://youtube.com/watch?v=${source.youtube_id}&t=${Math.floor(source.start_time)}s`;
  };

  return (
    <div className="border-l-2 border-primary pl-4 py-2 hover-elevate transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="relative w-16 h-9 shrink-0 rounded overflow-hidden bg-muted">
          <img
            src={source.thumbnail_url}
            alt={source.video_title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium line-clamp-1" data-testid={`text-source-title-${source.video_id}`}>
            {source.video_title}
          </h4>
          <a
            href={getYoutubeUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline flex items-center gap-1 mt-1 hover:text-primary/80"
            data-testid={`link-source-timestamp-${source.video_id}`}
          >
            <Play className="w-3 h-3" />
            {formatTimestamp(source.start_time)}
            <ExternalLink className="w-3 h-3" />
          </a>
          {source.content && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-normal">
              {source.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
