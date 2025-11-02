import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Youtube, FileText, File, FileAudio, ExternalLink, Eye, Edit, Trash2 } from 'lucide-react';
import type { Source } from '@shared/schema';

interface SourceCardProps {
  source: Source;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function SourceCard({ source, onView, onEdit, onDelete, showActions = false }: SourceCardProps) {
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

  const youtubeUrl = getYouTubeUrl(source.youtube_id);
  const isYouTube = source.source_type === 'youtube';

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow group"
      data-testid={`card-source-${source._id}`}
    >
      {/* Thumbnail or placeholder */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {isYouTube && source.thumbnail_url ? (
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
          <div className="w-full h-full flex items-center justify-center bg-muted" data-testid={`placeholder-${source._id}`}>
            <div className={`${source.source_type === 'text' ? 'text-blue-500' : source.source_type === 'document' ? 'text-green-500' : 'text-purple-500'}`}>
              {getPlaceholderIcon(source.source_type)}
            </div>
          </div>
        )}
        
        {/* Badges */}
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
          className="text-sm lg:text-sm line-clamp-2"
          data-testid={`text-title-${source._id}`}
        >
          {isYouTube && youtubeUrl ? (
            <a 
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              {source.title}
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
        
        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {onView && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onView}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        {source.url && !isYouTube && !showActions && (
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
}

