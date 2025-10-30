import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Youtube, FileText, Upload, Mic } from 'lucide-react';
import type { ImportResponse } from '@shared/schema';

export function SourceImporter() {
  const { toast } = useToast();
  
  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // Text state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textAuthor, setTextAuthor] = useState('');
  const [textUrl, setTextUrl] = useState('');
  
  // Document state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentAuthor, setDocumentAuthor] = useState('');
  
  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioAuthor, setAudioAuthor] = useState('');

  // YouTube import mutation
  const importYoutubeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/import-video', { youtubeUrl: url });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'YouTube video imported successfully!',
      });
      setYoutubeUrl('');
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import video',
        variant: 'destructive',
      });
    },
  });

  // Text import mutation
  const importTextMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; author?: string; url?: string }) => {
      const response = await apiRequest('POST', '/api/import-text', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Text imported successfully!',
      });
      setTextTitle('');
      setTextContent('');
      setTextAuthor('');
      setTextUrl('');
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import text',
        variant: 'destructive',
      });
    },
  });

  // Document import mutation
  const importDocumentMutation = useMutation({
    mutationFn: async (data: { file: File; title?: string; author?: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.title) formData.append('title', data.title);
      if (data.author) formData.append('author', data.author);

      const response = await fetch('/api/import-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import document');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document imported successfully!',
      });
      setDocumentFile(null);
      setDocumentTitle('');
      setDocumentAuthor('');
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import document',
        variant: 'destructive',
      });
    },
  });

  // Audio import mutation
  const importAudioMutation = useMutation({
    mutationFn: async (data: { file: File; title?: string; author?: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.title) formData.append('title', data.title);
      if (data.author) formData.append('author', data.author);

      const response = await fetch('/api/import-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import audio');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Audio imported and transcribed successfully!',
      });
      setAudioFile(null);
      setAudioTitle('');
      setAudioAuthor('');
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import audio',
        variant: 'destructive',
      });
    },
  });

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      importYoutubeMutation.mutate(youtubeUrl.trim());
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textTitle.trim() && textContent.trim()) {
      importTextMutation.mutate({
        title: textTitle.trim(),
        content: textContent.trim(),
        author: textAuthor.trim() || undefined,
        url: textUrl.trim() || undefined,
      });
    }
  };

  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (documentFile) {
      importDocumentMutation.mutate({
        file: documentFile,
        title: documentTitle.trim() || undefined,
        author: documentAuthor.trim() || undefined,
      });
    }
  };

  const handleAudioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioFile) {
      importAudioMutation.mutate({
        file: audioFile,
        title: audioTitle.trim() || undefined,
        author: audioAuthor.trim() || undefined,
      });
    }
  };

  const isAnyLoading = 
    importYoutubeMutation.isPending || 
    importTextMutation.isPending || 
    importDocumentMutation.isPending || 
    importAudioMutation.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Knowledge</CardTitle>
        <CardDescription>
          Add videos, articles, documents, or audio to your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="youtube" data-testid="tab-youtube">
              <Youtube className="w-4 h-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="text" data-testid="tab-text">
              <FileText className="w-4 h-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="document" data-testid="tab-document">
              <Upload className="w-4 h-4 mr-2" />
              Document
            </TabsTrigger>
            <TabsTrigger value="audio" data-testid="tab-audio">
              <Mic className="w-4 h-4 mr-2" />
              Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input
                  id="youtube-url"
                  data-testid="input-youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <Button 
                type="submit" 
                data-testid="button-import-youtube"
                disabled={!youtubeUrl.trim() || isAnyLoading}
                className="w-full"
              >
                {importYoutubeMutation.isPending ? 'Importing...' : 'Import Video'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-title">Title *</Label>
                <Input
                  id="text-title"
                  data-testid="input-text-title"
                  placeholder="Article or note title"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-content">Content *</Label>
                <Textarea
                  id="text-content"
                  data-testid="input-text-content"
                  placeholder="Paste your article, notes, or any text content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  disabled={isAnyLoading}
                  rows={8}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="text-author">Author (optional)</Label>
                  <Input
                    id="text-author"
                    data-testid="input-text-author"
                    placeholder="Author name"
                    value={textAuthor}
                    onChange={(e) => setTextAuthor(e.target.value)}
                    disabled={isAnyLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text-url">Source URL (optional)</Label>
                  <Input
                    id="text-url"
                    data-testid="input-text-url"
                    type="url"
                    placeholder="https://..."
                    value={textUrl}
                    onChange={(e) => setTextUrl(e.target.value)}
                    disabled={isAnyLoading}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                data-testid="button-import-text"
                disabled={!textTitle.trim() || !textContent.trim() || isAnyLoading}
                className="w-full"
              >
                {importTextMutation.isPending ? 'Importing...' : 'Import Text'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <form onSubmit={handleDocumentSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-file">File (PDF, DOCX, TXT) *</Label>
                <Input
                  id="document-file"
                  data-testid="input-document-file"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  disabled={isAnyLoading}
                />
                {documentFile && (
                  <p className="text-sm text-muted-foreground" data-testid="text-document-filename">
                    Selected: {documentFile.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-title">Title (optional)</Label>
                <Input
                  id="document-title"
                  data-testid="input-document-title"
                  placeholder="Leave empty to use filename"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-author">Author (optional)</Label>
                <Input
                  id="document-author"
                  data-testid="input-document-author"
                  placeholder="Author name"
                  value={documentAuthor}
                  onChange={(e) => setDocumentAuthor(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <Button 
                type="submit" 
                data-testid="button-import-document"
                disabled={!documentFile || isAnyLoading}
                className="w-full"
              >
                {importDocumentMutation.isPending ? 'Processing...' : 'Import Document'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <form onSubmit={handleAudioSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audio-file">Audio File (MP3, WAV, M4A) *</Label>
                <Input
                  id="audio-file"
                  data-testid="input-audio-file"
                  type="file"
                  accept=".mp3,.wav,.m4a,.aac,.ogg,.flac"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  disabled={isAnyLoading}
                />
                {audioFile && (
                  <p className="text-sm text-muted-foreground" data-testid="text-audio-filename">
                    Selected: {audioFile.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="audio-title">Title (optional)</Label>
                <Input
                  id="audio-title"
                  data-testid="input-audio-title"
                  placeholder="Leave empty to use filename"
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audio-author">Speaker/Author (optional)</Label>
                <Input
                  id="audio-author"
                  data-testid="input-audio-author"
                  placeholder="Speaker name"
                  value={audioAuthor}
                  onChange={(e) => setAudioAuthor(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <Button 
                type="submit" 
                data-testid="button-import-audio"
                disabled={!audioFile || isAnyLoading}
                className="w-full"
              >
                {importAudioMutation.isPending ? 'Transcribing...' : 'Import Audio'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
