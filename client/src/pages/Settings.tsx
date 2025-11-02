import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatbotPersonalization } from "@/components/settings/ChatbotPersonalization";
import { AISettings } from "@/components/settings/AISettings";
import { ConversationSessions } from "@/components/settings/ConversationSessions";

export default function Settings() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your AI assistant experience
          </p>
        </div>

        <Tabs defaultValue="chatbot" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
            <TabsTrigger value="ai">AI Model</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="chatbot">
            <Card>
              <CardHeader>
                <CardTitle>Chatbot Personalization</CardTitle>
                <CardDescription>
                  Customize how your AI assistant responds by setting a custom system prompt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChatbotPersonalization />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Settings</CardTitle>
                <CardDescription>
                  Adjust temperature, max tokens, and model selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AISettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Sessions</CardTitle>
                <CardDescription>
                  Manage your conversation history and resume previous conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConversationSessions />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

