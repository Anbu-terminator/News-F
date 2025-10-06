import { useState, DragEvent } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Link, Upload, Youtube, Loader2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";

// ✅ Set pdf.js worker dynamically for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function Summarizer() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "url" | "pdf" | "youtube">("text");
  const [isDragging, setIsDragging] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const { toast } = useToast();

  const parseApiResult = async (res: any) => {
    try {
      const parsed = await res.json();
      return { parsed, status: res.status };
    } catch {
      return { parsed: null, status: 500 };
    }
  };

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter text, a URL, YouTube link, or PDF content to summarize.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSummary("");
    setErrorMsg("");

    try {
      const body: Record<string, any> = {};
      if (activeTab === "text" || activeTab === "pdf") body.text = inputText;
      if (activeTab === "url" || activeTab === "youtube") body.url = inputText;

      const raw = await apiRequest("POST", `/api/summarize/${activeTab}`, body, false);
      const { parsed } = await parseApiResult(raw);

      const summaryText =
        parsed?.summary ?? parsed?.result ?? parsed?.message ?? parsed?.data?.summary ?? "";

      if (summaryText.trim()) {
        setSummary(summaryText.trim());
        toast({ title: "Summary generated!", description: "Your content has been successfully summarized" });
      } else {
        throw new Error(parsed?.error || parsed?.message || "Invalid response from server");
      }
    } catch (error: any) {
      console.error("Summarizer error:", error);
      setErrorMsg(error?.message || "Failed to generate summary");
      toast({ title: "Error", description: error?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setSummary("");
    setErrorMsg("");
    setPdfUploaded(false);
  };

  // ✅ Real PDF text extraction
  const extractPdfText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const txt = await page.getTextContent();
      textContent += txt.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return textContent;
  };

  const handlePdfUpload = async (file: File) => {
    try {
      const text = await extractPdfText(file);
      setInputText(text);
      setPdfUploaded(true);
      toast({ title: "PDF loaded", description: "PDF text extracted successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to extract text from PDF", variant: "destructive" });
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(entering);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      handlePdfUpload(file);
    } else {
      toast({ title: "Invalid file", description: "Upload a valid PDF file", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">AI Article Summarizer</h1>
          <p className="text-lg text-muted-foreground">Summarize articles, PDFs, or YouTube videos with AI</p>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text</TabsTrigger>
              <TabsTrigger value="pdf"><Upload className="w-4 h-4 mr-2" />PDF</TabsTrigger>
              <TabsTrigger value="url"><Link className="w-4 h-4 mr-2" />URL</TabsTrigger>
              <TabsTrigger value="youtube"><Youtube className="w-4 h-4 mr-2" />YouTube</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="text">
                <Label>Enter text to summarize</Label>
                <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="min-h-[300px]" />
              </TabsContent>

              <TabsContent value="pdf">
                <motion.div
                  onDragEnter={(e) => handleDrag(e, true)}
                  onDragOver={(e) => handleDrag(e, true)}
                  onDragLeave={(e) => handleDrag(e, false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center ${
                    isDragging ? "border-primary bg-primary/10" :
                    pdfUploaded ? "border-green-500 bg-green-50" :
                    "border-border hover:border-primary/70 hover:bg-muted/50"
                  }`}
                  onClick={() => document.getElementById("pdf-upload-input")?.click()}
                >
                  {pdfUploaded ? (
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  ) : (
                    <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold mb-2">
                    {pdfUploaded ? "PDF Uploaded Successfully!" : "Drag & Drop or Click to Upload PDF"}
                  </h3>
                  <input
                    id="pdf-upload-input"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files && handlePdfUpload(e.target.files[0])}
                    className="hidden"
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="url">
                <Label>Enter article URL</Label>
                <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="min-h-[150px]" />
              </TabsContent>

              <TabsContent value="youtube">
                <Label>Enter YouTube video URL</Label>
                <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="min-h-[150px]" />
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <Button onClick={handleSummarize} disabled={loading || !inputText.trim()}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : "Generate Summary"}
            </Button>
          </div>
        </Card>

        {(summary || errorMsg) && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Summary:</h2>
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {summary || `⚠️ ${errorMsg}`}
              </p>
            </div>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
