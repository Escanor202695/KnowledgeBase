import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Send,
  Loader2,
  MessageSquare,
  Plus,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SourceCitation } from "./SourceCitation";
import { SourceViewer } from "./SourceViewer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Source,
} from "@shared/schema";

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null
  );
  const [viewingSource, setViewingSource] = useState<Source | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation if conversationId is set
  useQuery({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await apiRequest(
        "GET",
        `/api/conversations/${conversationId}`
      );
      return res.json();
    },
    enabled: !!conversationId,
    onSuccess: (data) => {
      if (data?.conversation) {
        setConversationTitle(data.conversation.title);
        const loadedMessages: ChatMessage[] = data.conversation.messages.map(
          (m: any, idx: number) => ({
            id: `${conversationId}-${idx}`,
            role: m.role,
            content: m.content,
            sources: m.sources || undefined,
            timestamp: new Date(m.timestamp),
          })
        );
        setMessages(loadedMessages);
      }
    },
  });

  const chatMutation = useMutation<
    ChatResponse & { conversationId?: string | null },
    Error,
    ChatRequest
  >({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/chat", data);
      return res.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update conversation ID if this is a new conversation
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        // Refresh conversation to get title
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", data.conversationId],
        });
      }
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setConversationTitle(null);
  };

  // Fetch all sources for lookup when a citation is clicked
  const { data: sourcesData } = useQuery<{ sources: Source[] }>({
    queryKey: ["/api/sources"],
  });

  const handleSourceClick = async (sourceId: string) => {
    // Find the source from the cached list
    if (sourcesData?.sources) {
      const source = sourcesData.sources.find((s) => s._id === sourceId);
      if (source) {
        setViewingSource(source);
        return;
      }
    }

    // If not in cache, fetch all sources and find it
    try {
      const res = await apiRequest("GET", "/api/sources");
      const data = await res.json();
      const source = data.sources?.find((s: Source) => s._id === sourceId);
      if (source) {
        setViewingSource(source);
      }
    } catch (error) {
      console.error("Failed to fetch source:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput("");

    chatMutation.mutate({
      message: messageText,
      conversationId: conversationId || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (messages.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <MessageSquare className="w-12 h-12 text-muted-foreground opacity-40" />
          <h3 className="text-lg font-medium mt-4">Start a conversation</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
            Ask questions about your knowledge base and get AI-powered answers
            with source citations
          </p>
          {conversationId && (
            <p className="text-xs text-muted-foreground mt-2">
              {conversationTitle || "Loading conversation..."}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything from your knowledge base..."
              className="min-h-[60px] max-h-[120px] resize-none text-sm"
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || chatMutation.isPending}
              className="h-10 w-10 shrink-0"
              data-testid="button-send-message"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Conversation Header */}
      {(conversationId || conversationTitle) && (
        <div className="flex items-center justify-between border-b p-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {conversationTitle || "Conversation"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            className="shrink-0"
            data-testid="button-new-conversation"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`${
                message.role === "user" ? "max-w-[80%]" : "max-w-[85%]"
              } space-y-2`}
            >
              <div
                className={`rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                data-testid={`message-${message.id}`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="space-y-2 pl-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sources:
                  </p>
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSourceClick(source.source_id)}
                      className="cursor-pointer"
                    >
                      <SourceCitation source={source} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your videos..."
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            disabled={chatMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || chatMutation.isPending}
            className="h-10 w-10 shrink-0"
            data-testid="button-send-message"
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Source Viewer Dialog */}
      {viewingSource && (
        <SourceViewer
          source={viewingSource}
          open={!!viewingSource}
          onOpenChange={(open) => !open && setViewingSource(null)}
        />
      )}
    </Card>
  );
}
