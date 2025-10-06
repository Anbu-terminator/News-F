import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText, Link, Upload, Youtube, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface SummarizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SummarizerModal({ open, onOpenChange }: SummarizerModalProps) {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [pdfName, setPdfName] = useState("");
  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter text or upload a PDF to summarize.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(
        "POST",
        "/api/summarize/text",
        { text: inputText },
        false
      );
      const data = await response.json();
      setSummary(data.summary);

      toast({
        title: "Summary generated!",
        description: "Your content has been successfully summarized.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfName(file.name);
    setLoading(true);
    try {
      const pdfData = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

      let extractedText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        extractedText += strings.join(" ") + "\n\n";
      }

      setInputText(extractedText);
      toast({
        title: "PDF Extracted",
        description: `Extracted text from ${pdf.numPages} page(s). Ready to summarize.`,
      });
    } catch (error) {
      console.error("PDF extraction failed:", error);
      toast({
        title: "Error reading PDF",
        description:
          "Could not extract text. Try using a different file or ensure it’s not scanned.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setSummary("");
    setPdfName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid="modal-summarizer"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>AI Article Summarizer</span>
          </DialogTitle>
          <DialogDescription>
            Paste text, enter a URL, upload a PDF, or provide a YouTube link to
            get an instant AI-generated summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text">
                <FileText className="w-4 h-4 mr-2" />
                Text
              </TabsTrigger>
              <TabsTrigger value="url">
                <Link className="w-4 h-4 mr-2" />
                URL
              </TabsTrigger>
              <TabsTrigger value="pdf">
                <Upload className="w-4 h-4 mr-2" />
                PDF
              </TabsTrigger>
              <TabsTrigger value="youtube">
                <Youtube className="w-4 h-4 mr-2" />
                YouTube
              </TabsTrigger>
            </TabsList>

            {/* TEXT TAB */}
            <TabsContent value="text" className="space-y-4">
              <div>
                <Label htmlFor="text-input">Enter text to summarize</Label>
                <Textarea
                  id="text-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your article text here..."
                  className="min-h-[200px] resize-none"
                />
              </div>
            </TabsContent>

            {/* URL TAB */}
            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="url-input">Enter article URL</Label>
                <Textarea
                  id="url-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://example.com/article"
                  className="min-h-[100px] resize-none"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Note: URL extraction feature is coming soon.
                </p>
              </div>
            </TabsContent>

            {/* ✅ FIXED PDF TAB */}
            <TabsContent value="pdf" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <Label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 mb-3 text-muted-foreground" />
                  <span className="font-medium">
                    {pdfName || "Click to upload a PDF"}
                  </span>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supported: standard text-based PDFs
                  </p>
                </Label>
              </div>
            </TabsContent>

            {/* YOUTUBE TAB */}
            <TabsContent value="youtube" className="space-y-4">
              <div>
                <Label htmlFor="youtube-input">Enter YouTube video URL</Label>
                <Textarea
                  id="youtube-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="min-h-[100px] resize-none"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Note: YouTube transcript extraction is coming soon.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {summary && (
            <Card className="p-6" data-testid="summary-result">
              <h3 className="text-lg font-semibold mb-3">Summary:</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </Card>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button
              onClick={handleSummarize}
              disabled={loading || !inputText.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Generate Summary"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
