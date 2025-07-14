import { useState } from "react";
import { Header } from "@/components/Header";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentSummary } from "@/components/DocumentSummary";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<any>(null);

  const handleDocumentUploaded = (document: any) => {
    setCurrentDocument(document);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors duration-300">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar - Document Upload & Summary */}
          <div className="lg:col-span-1">
            <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
            
            {currentDocument && (
              <DocumentSummary 
                summary={currentDocument.summary}
                wordCount={currentDocument.summary?.split(' ').length}
                processingTime={3.2}
              />
            )}
          </div>

          {/* Main Content - Chat Interface */}
          <div className="lg:col-span-2">
            <ChatInterface document={currentDocument} />
          </div>

        </div>
      </div>
    </div>
  );
}
