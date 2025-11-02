import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { SourceCard } from '@/components/SourceCard';
import { SourceViewer } from '@/components/SourceViewer';
import { SourceEditor } from '@/components/SourceEditor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Search, Grid, List } from 'lucide-react';
import type { Source } from '@shared/schema';

type SourceType = 'all' | 'youtube' | 'document' | 'text' | 'audio';
type ViewMode = 'grid' | 'list';

interface SourcesResponse {
  sources: Source[];
}

export default function Sources() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<SourceType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [viewingSource, setViewingSource] = useState<Source | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [deletingSource, setDeletingSource] = useState<Source | null>(null);

  const { data, isLoading, error } = useQuery<SourcesResponse>({
    queryKey: ['/api/sources'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/sources/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Source deleted successfully',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      setDeletingSource(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete source',
        variant: 'destructive',
      });
    },
  });

  const filteredSources = useMemo(() => {
    if (!data?.sources) return [];

    let filtered = data.sources;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.source_type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.author?.toLowerCase().includes(query) ||
        s.content?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data?.sources, selectedType, searchQuery]);

  const sourceCounts = useMemo(() => {
    if (!data?.sources) return { all: 0, youtube: 0, document: 0, text: 0, audio: 0 };
    
    return {
      all: data.sources.length,
      youtube: data.sources.filter(s => s.source_type === 'youtube').length,
      document: data.sources.filter(s => s.source_type === 'document').length,
      text: data.sources.filter(s => s.source_type === 'text').length,
      audio: data.sources.filter(s => s.source_type === 'audio').length,
    };
  }, [data?.sources]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <p className="text-destructive">Failed to load sources</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Sources Management</h1>
            <p className="text-muted-foreground mt-1">
              View, manage, and organize all your imported sources
            </p>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as SourceType)}>
            <TabsList>
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">
                  {sourceCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="youtube">
                YouTube
                <Badge variant="secondary" className="ml-2">
                  {sourceCounts.youtube}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="document">
                Documents
                <Badge variant="secondary" className="ml-2">
                  {sourceCounts.document}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="text">
                Text
                <Badge variant="secondary" className="ml-2">
                  {sourceCounts.text}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="audio">
                Audio
                <Badge variant="secondary" className="ml-2">
                  {sourceCounts.audio}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sources Grid/List */}
          {filteredSources.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery || selectedType !== 'all'
                  ? 'No sources found matching your filters'
                  : 'No sources yet. Import your first source from the home page.'}
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-4'
              }
            >
              {filteredSources.map((source) => (
                <SourceCard
                  key={source._id}
                  source={source}
                  showActions
                  onView={() => setViewingSource(source)}
                  onEdit={() => setEditingSource(source)}
                  onDelete={() => setDeletingSource(source)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Source Viewer Dialog */}
        {viewingSource && (
          <SourceViewer
            source={viewingSource}
            open={!!viewingSource}
            onOpenChange={(open) => !open && setViewingSource(null)}
          />
        )}

        {/* Source Editor Dialog */}
        {editingSource && (
          <SourceEditor
            source={editingSource}
            open={!!editingSource}
            onOpenChange={(open) => !open && setEditingSource(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingSource} onOpenChange={(open) => !open && setDeletingSource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Source</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingSource?.title}"? This will also delete all associated chunks and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingSource) {
                    deleteMutation.mutate(deletingSource._id);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

