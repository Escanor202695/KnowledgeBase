import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ImportVideoRequest, ImportVideoResponse } from "@shared/schema";

interface VideoInputProps {
  onVideoAdded: () => void;
}

export function VideoInput({ onVideoAdded }: VideoInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const importMutation = useMutation<ImportVideoResponse, Error, ImportVideoRequest>({
    mutationFn: async (data) => {
      return apiRequest("POST", "/api/import-video", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Video imported and processed successfully",
      });
      setUrl("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      onVideoAdded();
    },
    onError: (err) => {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    importMutation.mutate({ youtubeUrl: url });
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="youtube-url" className="block text-sm font-medium mb-2">
            Add YouTube Video
          </label>
          <Input
            id="youtube-url"
            type="text"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={importMutation.isPending}
            className="h-10 text-sm"
            data-testid="input-youtube-url"
          />
          {error && (
            <p className="text-xs text-destructive mt-1" data-testid="text-error">
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={importMutation.isPending}
          className="w-full h-10"
          data-testid="button-import-video"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Import Video
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
