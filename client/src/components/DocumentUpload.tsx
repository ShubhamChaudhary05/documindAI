import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onDocumentUploaded: (document: any) => void;
}

export function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Starting upload for file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      const formData = new FormData();
      formData.append('document', file);
      
      try {
        const response = await apiRequest('POST', '/api/documents/upload', formData);
        console.log('Upload response received:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        return data;
      } catch (error) {
        console.error('Upload error details:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Upload success:', data);
      onDocumentUploaded(data.document);
      toast({
        title: "Document uploaded successfully",
        description: "Your document has been processed and is ready for analysis.",
      });
    },
    onError: (error: any) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or TXT file.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    uploadMutation.mutate(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
          <Upload className="mr-2 text-blue-500" size={20} />
          Document Upload
        </h2>

        {!uploadedFile && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer ${
              dragActive
                ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto text-4xl text-gray-400 dark:text-slate-500 mb-4" size={48} />
            <p className="text-gray-600 dark:text-slate-400 mb-2">Drop your document here or</p>
            <Button variant="link" className="text-blue-600 dark:text-blue-400 font-medium p-0">
              browse files
            </Button>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">Supports PDF and TXT files</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        )}

        {uploadedFile && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <File className="text-red-500" size={20} />
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={uploadMutation.isPending}
                className="text-gray-400 hover:text-red-500 transition-colors duration-200"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="mt-4 flex items-center space-x-2 text-sm">
            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
            <span className="text-blue-600 dark:text-blue-400">Processing document...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
