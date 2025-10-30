import { Header } from "@/components/Header";
import { SourceImporter } from "@/components/SourceImporter";
import { SourceLibrary } from "@/components/SourceLibrary";
import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Accordion Sections */}
          <div className="lg:col-span-2 flex flex-col lg:h-[calc(100vh-8rem)] lg:overflow-hidden">
            <Accordion type="single" defaultValue="library" collapsible className="flex flex-col flex-1 gap-3 min-h-0">
              {/* Import Knowledge Section */}
              <AccordionItem value="import" className="border-0 flex flex-col data-[state=open]:flex-1 min-h-0">
                <Card className="flex flex-col h-full min-h-0">
                  <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>div]:border-b flex-shrink-0">
                    <CardHeader className="hover-elevate flex flex-row items-center justify-between p-4 w-full">
                      <CardTitle className="text-base">Import Knowledge</CardTitle>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent className="flex-1 min-h-0 overflow-y-auto pb-0">
                    <CardContent className="p-4 pt-4">
                      <SourceImporter />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Knowledge Base Section */}
              <AccordionItem value="library" className="border-0 flex flex-col data-[state=open]:flex-1 min-h-0">
                <Card className="flex flex-col h-full min-h-0">
                  <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>div]:border-b flex-shrink-0">
                    <CardHeader className="hover-elevate flex flex-row items-center justify-between p-4 w-full">
                      <CardTitle className="text-base">Your Knowledge Base</CardTitle>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent className="flex-1 min-h-0 overflow-y-auto pb-0">
                    <CardContent className="p-4 pt-4">
                      <SourceLibrary />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
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
