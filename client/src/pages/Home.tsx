import { Header } from "@/components/Header";
import { SourceImporter } from "@/components/SourceImporter";
import { SourceLibrary } from "@/components/SourceLibrary";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Source Input and Library */}
          <div className="lg:col-span-2 space-y-6">
            <SourceImporter />
            <SourceLibrary />
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
