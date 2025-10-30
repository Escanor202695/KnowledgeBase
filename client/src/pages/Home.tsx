import { Header } from "@/components/Header";
import { SourceImporter } from "@/components/SourceImporter";
import { SourceLibrary } from "@/components/SourceLibrary";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Source Input and Library */}
          <div className="lg:col-span-2 flex flex-col gap-6 lg:h-[calc(100vh-8rem)]">
            {/* Fixed Upload Section */}
            <div className="flex-shrink-0">
              <SourceImporter />
            </div>
            
            {/* Scrollable Knowledge Base */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SourceLibrary />
            </div>
          </div>

          {/* Right Panel - Chat Interface (Fixed) */}
          <div className="lg:col-span-3 lg:h-[calc(100vh-8rem)] lg:sticky lg:top-6">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
}
