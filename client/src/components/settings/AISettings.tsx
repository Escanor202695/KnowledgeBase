import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function AISettings() {
  const { toast } = useToast();
  const [temperature, setTemperature] = useState<number[]>([0.7]);
  const [maxTokens, setMaxTokens] = useState<number[]>([8192]);
  const [model, setModel] = useState<string>("gpt-3.5-turbo");

  // Load current preferences
  const { isLoading } = useQuery<{
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
      setTemperature([data.preferences.temperature]);
      setMaxTokens([data.preferences.maxTokens]);
      setModel(data.preferences.model);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/preferences", {
        temperature: temperature[0],
        maxTokens: maxTokens[0],
        model,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/preferences"] });
      toast({
        title: "Saved",
        description: "Your AI settings have been saved.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature">Temperature: {temperature[0].toFixed(1)}</Label>
          <span className="text-xs text-muted-foreground">
            {temperature[0] < 0.5 ? "Focused" : temperature[0] < 1.0 ? "Balanced" : "Creative"}
          </span>
        </div>
        <Slider
          id="temperature"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onValueChange={setTemperature}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Controls randomness. Lower values make responses more focused, higher values more creative.
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="max-tokens">Max Tokens: {maxTokens[0].toLocaleString()}</Label>
        </div>
        <Slider
          id="max-tokens"
          min={1000}
          max={16000}
          step={500}
          value={maxTokens}
          onValueChange={setMaxTokens}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of tokens in the AI response. Higher values allow longer responses.
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger id="model">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-5">GPT-5 (Latest - Flagship)</SelectItem>
            <SelectItem value="gpt-4.5">GPT-4.5 (Orion)</SelectItem>
            <SelectItem value="gpt-4.1">GPT-4.1 (1M context)</SelectItem>
            <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini (Cost-efficient)</SelectItem>
            <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano (Ultra-fast)</SelectItem>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose the AI model to use for generating responses.
        </p>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        Save Settings
      </Button>
    </div>
  );
}

