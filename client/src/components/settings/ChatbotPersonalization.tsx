import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DEFAULT_PROMPT = `You are a helpful AI assistant with access to a multi-source knowledge base including YouTube videos, articles, documents, and audio transcriptions.

INSTRUCTIONS:
1. Answer questions using ONLY the information in the provided context (if any)
2. If the context doesn't contain the answer, say "I don't have information about that in the knowledge base"
3. Cite sources naturally in your answer by mentioning the source title
4. Be conversational and concise
5. Do not make up information`;

export function ChatbotPersonalization() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState<string>("");

  // Load current preferences
  const { data, isLoading } = useQuery<{
    preferences: {
      defaultSystemPrompt: string | null;
      temperature: number;
      maxTokens: number;
      model: string;
    };
  }>({
    queryKey: ["/api/auth/preferences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/auth/preferences");
      return res.json();
    },
    onSuccess: (data) => {
      setPrompt(data.preferences.defaultSystemPrompt || "");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newPrompt: string) => {
      const res = await apiRequest("PATCH", "/api/auth/preferences", {
        defaultSystemPrompt: newPrompt.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/preferences"] });
      toast({
        title: "Saved",
        description: "Your custom prompt has been saved.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences.",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/preferences", {
        defaultSystemPrompt: undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      setPrompt("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/preferences"] });
      toast({
        title: "Reset",
        description: "Prompt has been reset to default.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset prompt.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="system-prompt">Custom System Prompt</Label>
        <Textarea
          id="system-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={DEFAULT_PROMPT}
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use the default prompt. This prompt will be used for all new conversations unless overridden.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => saveMutation.mutate(prompt)}
          disabled={saveMutation.isPending || resetMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() => resetMutation.mutate()}
          disabled={saveMutation.isPending || resetMutation.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
}

