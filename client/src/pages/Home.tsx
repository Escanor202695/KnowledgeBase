import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { VideoInput } from "@/components/VideoInput";
import { VideoLibrary } from "@/components/VideoLibrary";
import { ChatInterface } from "@/components/ChatInterface";
import type { VideosResponse } from "@shared/schema";

export default function Home() {
  const { data, isLoading, refetch } = useQuery<VideosResponse>({
    queryKey: ["/api/videos"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Video Input and Library */}
          <div className="lg:col-span-2 space-y-6">
            <VideoInput onVideoAdded={() => refetch()} />
            <VideoLibrary 
              videos={data?.videos || []} 
              isLoading={isLoading}
            />
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-3 lg:min-h-[calc(100vh-8rem)]">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
}
