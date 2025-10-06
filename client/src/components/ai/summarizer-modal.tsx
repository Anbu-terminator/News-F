import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url"; // ✅ Vite-friendly import

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SummarizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSummarize: (text: string) => Promise<string>;
}

const SummarizerModal: React.FC<SummarizerModalProps> = ({
  open,
  onOpenChange,
  onSummarize,
}) => {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfName, setPdfName] = useState("");
  const [error, setError] = useState("");

  // ✅ Set up pdf.js worker dynamically for Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

  // ✅ Load PDF file and extract all text
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfName(file.name);
    setSummary("");
    setError("");
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textContent = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const txt = await page.getTextContent();
        textContent += txt.items.map((item: any) => item.str).join(" ");
      }

      // ✅ Summarize extracted text
      const result = await onSummarize(textContent);
      setSummary(result);
    } catch (err) {
      console.error("PDF parsing failed:", err);
      setError("Failed to read or summarize PDF. Try another file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PDF Summarizer</DialogTitle>
          <DialogDescription>
            Upload a PDF file and get an AI-generated summary instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="border p-2 rounded-md"
          />

          {loading && (
            <p className="text-sm text-blue-600 animate-pulse">
              Extracting and summarizing...
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">
              {error}
            </p>
          )}

          {summary && (
            <div className="bg-gray-50 border rounded-md p-3 max-h-80 overflow-auto">
              <h3 className="font-semibold mb-2">{pdfName}</h3>
              <p className="text-sm whitespace-pre-line">{summary}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SummarizerModal;
