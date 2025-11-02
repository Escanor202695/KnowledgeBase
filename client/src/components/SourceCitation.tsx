import { Play, ExternalLink, Youtube, FileText, FileAudio, File } from "lucide-react";
import type { SourceCitation as SourceCitationType } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface SourceCitationProps {
  source: SourceCitationType;
}

export function SourceCitation({ source }: SourceCitationProps) {
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSourceIcon = () => {
    switch (source.source_type) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-500" />;
      case 'text':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-purple-500" />;
      case 'document':
        return <File className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSourceUrl = () => {
    if (source.source_type === 'youtube' && source.url) {
      // Add timestamp to YouTube URL
      const baseUrl = source.url.split('&t=')[0];
      return `${baseUrl}&t=${Math.floor(source.start_time)}s`;
    }
    return source.url;
  };

  const hasTimestamp = source.source_type === 'youtube' || source.source_type === 'audio';

  return (
    <Card className="p-3 hover-elevate cursor-pointer transition-all" data-testid={`card-source-${source.source_id}`}>
      <div className="flex items-start gap-3">
        {/* Thumbnail or Icon */}
        <div className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
          {source.thumbnail_url && source.source_type === 'youtube' ? (
            <img
              src={source.thumbnail_url}
              alt={source.source_title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center">
                    ${getSourceIcon()}
                  </div>
                `;
              }}
            />
          ) : (
            getSourceIcon()
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold line-clamp-2 mb-1" data-testid={`text-source-title-${source.source_id}`}>
            {source.source_title}
          </h4>
          
          {/* Author */}
          {source.author && (
            <p className="text-xs text-muted-foreground mb-1">
              by {source.author}
            </p>
          )}

          {/* Timestamp link for YouTube/Audio */}
          {hasTimestamp && source.url && (
            <a
              href={getSourceUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 hover:text-primary/80 transition-colors"
              data-testid={`link-source-timestamp-${source.source_id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Play className="w-3 h-3" />
              Jump to {formatTimestamp(source.start_time)}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Content preview */}
          {source.content && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
              {source.content}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
