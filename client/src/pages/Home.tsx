import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { SourceImporter } from "@/components/SourceImporter";
import { SourceLibrary } from "@/components/SourceLibrary";
import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  const [accordionValue, setAccordionValue] = useState<string>("library");
  const previousValueRef = useRef<string>("library");

  const handleValueChange = (value: string | undefined) => {
    // If trying to close (value is undefined), open the other one instead
    if (value === undefined || value === "") {
      // Use previous value to determine which one to open
      const currentOpen = previousValueRef.current;
      const otherValue = currentOpen === "library" ? "import" : "library";
      setAccordionValue(otherValue);
      previousValueRef.current = otherValue;
    } else {
      // Normal opening of an accordion
      setAccordionValue(value);
      previousValueRef.current = value;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Accordion Sections */}
          <div className="lg:col-span-2 flex flex-col lg:max-h-[calc(100vh-8rem)]">
            <Accordion
              type="single"
              value={accordionValue}
              onValueChange={handleValueChange}
              className="flex flex-col flex-1 gap-3 min-h-0"
            >
              {/* Import Knowledge Section */}
              <AccordionItem
                value="import"
                className="border-0 flex flex-col data-[state=open]:flex-1 min-h-0"
              >
                <Card className="flex flex-col h-full">
                  <AccordionTrigger
                    className="hover:no-underline p-0 pr-4 [&[data-state=open]>div]:border-b flex-shrink-0 hover-elevate"
                    onClick={(e) => {
                      // If this is already open, switch to the other one instead
                      if (accordionValue === "import") {
                        e.preventDefault();
                        handleValueChange("library");
                      }
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between p-4 w-full">
                      <CardTitle className="text-base">Import Source</CardTitle>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="overflow-y-auto max-h-[60vh]">
                      <CardContent className="p-4 pt-4">
                        <SourceImporter />
                      </CardContent>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Knowledge Base Section */}
              <AccordionItem
                value="library"
                className="border-0 flex flex-col data-[state=open]:flex-1 min-h-0"
              >
                <Card className="flex flex-col h-full">
                  <AccordionTrigger
                    className="hover:no-underline p-0 pr-4 [&[data-state=open]>div]:border-b flex-shrink-0 hover-elevate"
                    onClick={(e) => {
                      // If this is already open, switch to the other one instead
                      if (accordionValue === "library") {
                        e.preventDefault();
                        handleValueChange("import");
                      }
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between p-4 w-full">
                      <CardTitle className="text-base">
                        Your Knowledge Base
                      </CardTitle>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="overflow-y-auto max-h-[60vh]">
                      <CardContent className="p-4 pt-4">
                        <SourceLibrary />
                      </CardContent>
                    </div>
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
