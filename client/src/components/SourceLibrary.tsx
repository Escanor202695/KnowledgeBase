import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Youtube, FileText, Upload, Mic, ExternalLink, File, FileAudio } from 'lucide-react';
import type { Source } from '@shared/schema';

interface SourcesResponse {
  sources: Source[];
}

export function SourceLibrary() {
  const { data, isLoading, error } = useQuery<SourcesResponse>({
    queryKey: ['/api/sources'],
  });

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'youtube':
        return <Youtube className="w-5 h-5" />;
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'document':
        return <File className="w-5 h-5" />;
      case 'audio':
        return <FileAudio className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getSourceBadgeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'youtube':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'text':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'document':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'audio':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPlaceholderIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'text':
        return <FileText className="w-12 h-12" />;
      case 'document':
        return <File className="w-12 h-12" />;
      case 'audio':
        return <FileAudio className="w-12 h-12" />;
      default:
        return <FileText className="w-12 h-12" />;
    }
  };

  const getYouTubeUrl = (youtubeId?: string) => {
    if (!youtubeId) return null;
    return `https://www.youtube.com/watch?v=${youtubeId}`;
  };

  if (isLoading) {
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-4">Loading sources...</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-destructive">Failed to load sources</p>
      </div>
    );
  }

  const sources = data?.sources || [];

  if (sources.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          No sources yet. Import your first video, article, document, or audio file above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {sources.length} {sources.length === 1 ? 'source' : 'sources'} imported
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source) => {
            const youtubeUrl = getYouTubeUrl(source.youtube_id);
            const isYouTube = source.source_type === 'youtube';
            
            return (
              <Card 
                key={source._id} 
                className="overflow-hidden hover-elevate"
                data-testid={`card-source-${source._id}`}
              >
                {/* Thumbnail or placeholder for all sources */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {isYouTube && source.thumbnail_url ? (
                    // YouTube thumbnail
                    youtubeUrl ? (
                      <a 
                        href={youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full h-full"
                        data-testid={`link-youtube-${source._id}`}
                      >
                        <img
                          src={source.thumbnail_url}
                          alt={source.title}
                          className="w-full h-full object-cover"
                          data-testid={`img-thumbnail-${source._id}`}
                        />
                      </a>
                    ) : (
                      <img
                        src={source.thumbnail_url}
                        alt={source.title}
                        className="w-full h-full object-cover"
                        data-testid={`img-thumbnail-${source._id}`}
                      />
                    )
                  ) : (
                    // Placeholder icon for non-YouTube sources
                    <div className="w-full h-full flex items-center justify-center bg-muted" data-testid={`placeholder-${source._id}`}>
                      <div className={`${source.source_type === 'text' ? 'text-blue-500' : source.source_type === 'document' ? 'text-green-500' : 'text-purple-500'}`}>
                        {getPlaceholderIcon(source.source_type)}
                      </div>
                    </div>
                  )}
                  
                  {/* Badges positioned at top-right corner */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getSourceBadgeColor(source.source_type)}`}
                      data-testid={`badge-type-${source._id}`}
                    >
                      <span className="capitalize">{source.source_type}</span>
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="space-y-1.5 p-3 lg:p-4">
                  <CardTitle 
                    className="text-sm lg:text-base line-clamp-2"
                    data-testid={`text-title-${source._id}`}
                  >
                    {isYouTube && youtubeUrl ? (
                      <a 
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary inline-flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      source.title
                    )}
                  </CardTitle>
                  
                  {/* Show content preview for non-YouTube sources */}
                  {!isYouTube && source.content && (
                    <CardDescription 
                      className="text-xs lg:text-sm line-clamp-2"
                      data-testid={`text-preview-${source._id}`}
                    >
                      {source.content}
                    </CardDescription>
                  )}
                  
                  {source.author && (
                    <CardDescription 
                      className="text-xs line-clamp-1"
                      data-testid={`text-author-${source._id}`}
                    >
                      {source.author}
                    </CardDescription>
                  )}
                  
                  {source.url && !isYouTube && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                      data-testid={`link-source-${source._id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View source
                    </a>
                  )}
                </CardHeader>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
