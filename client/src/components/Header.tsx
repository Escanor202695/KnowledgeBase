import { Brain } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex flex-wrap h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Second Brain</span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            AI-Powered Knowledge Base
          </p>
        </div>
      </div>
    </header>
  );
}
