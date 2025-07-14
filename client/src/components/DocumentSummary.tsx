import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface DocumentSummaryProps {
  summary: string;
  wordCount?: number;
  processingTime?: number;
}

export function DocumentSummary({ summary, wordCount, processingTime }: DocumentSummaryProps) {
  if (!summary) return null;

  return (
    <Card className="mt-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
          <FileText className="mr-2 text-emerald-500" size={20} />
          Auto Summary
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            {summary}
          </p>
          <div className="mt-3 text-xs text-gray-500 dark:text-slate-400 flex items-center space-x-4">
            {wordCount && <span>{wordCount} words</span>}
            {processingTime && <span>Generated in {processingTime}s</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
