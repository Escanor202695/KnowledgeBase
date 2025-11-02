import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Source } from '@shared/schema';

interface SourceViewerProps {
  source: Source | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SourceViewer({ source, open, onOpenChange }: SourceViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const getFileUrl = () => {
    if (!source.file_url) return null;
    // Handle both absolute and relative paths
    if (source.file_url.startsWith('/uploads/')) {
      return source.file_url;
    }
    if (source.file_url.startsWith('uploads/')) {
      return `/${source.file_url}`;
    }
    return `/uploads/${source.file_url.split('uploads/')[1] || source.file_url}`;
  };

  const fileUrl = getFileUrl();
  const isYouTube = source.source_type === 'youtube';
  const isPDF = source.file_type === 'application/pdf' || source.file_url?.endsWith('.pdf');
  const isText = source.source_type === 'text' || source.file_type === 'text/plain' || source.file_url?.endsWith('.txt');
  const isAudio = source.source_type === 'audio' || source.file_type?.startsWith('audio/');

  const handleCopyText = () => {
    if (source.content) {
      navigator.clipboard.writeText(source.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getYouTubeUrl = () => {
    if (source.youtube_id) {
      return `https://www.youtube.com/watch?v=${source.youtube_id}`;
    }
    return source.url;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg line-clamp-2">{source.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
           
            {source.author && (
              <span className="text-xs text-muted-foreground">by {source.author}</span>
            )}
            {source.duration && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(source.duration)}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {isYouTube ? (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {source.thumbnail_url ? (
                  <img
                    src={source.thumbnail_url}
                    alt={source.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground">YouTube Video</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const url = getYouTubeUrl();
                    if (url) window.open(url, '_blank');
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Watch on YouTube
                </Button>
              </div>
            </div>
          ) : isPDF && fileUrl ? (
            <div className="space-y-4">
              <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
                <iframe
                  src={fileUrl}
                  className="w-full h-full"
                  title={source.title}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + fileUrl)}&embedded=true`;
                    window.open(googleViewerUrl, '_blank');
                  }}
                >
                  Open with Google Viewer
                </Button>
              </div>
            </div>
          ) : isAudio && fileUrl ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
                <audio
                  controls
                  className="w-full max-w-md"
                  src={fileUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          ) : isText || source.content ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 max-h-[60vh] overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {source.content || 'No content available'}
                </pre>
              </div>
              {source.content && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyText}
                    variant="outline"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Text
                      </>
                    )}
                  </Button>
                  {fileUrl && (
                    <Button
                      onClick={() => window.open(fileUrl, '_blank')}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open File
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : fileUrl ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-8 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                <p className="text-muted-foreground">File type: {source.file_type || 'unknown'}</p>
                <Button
                  onClick={() => window.open(fileUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open File in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-8 flex items-center justify-center min-h-[400px]">
              <p className="text-muted-foreground">No file available to view</p>
            </div>
          )}
        </div>

        {source.url && !isYouTube && (
          <div className="mt-4 pt-4 border-t">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View original source
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

