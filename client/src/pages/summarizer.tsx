import { useState, DragEvent } from "react";
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

  // ---------------- PDF Upload & Extract ----------------
  const handlePdfUpload = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const raw = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const { parsed } = await parseApiResult(raw);

      if (parsed?.text) {
        setInputText(parsed.text);
        setPdfUploaded(true);
        toast({ title: "PDF loaded", description: "Text extracted successfully" });
      } else {
        throw new Error(parsed?.error || "PDF extraction failed");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "PDF extraction failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Download Summary as PDF ----------------
  const handleDownloadPdf = async () => {
    try {
      if (!summary.trim()) throw new Error("No summary to download");
      const raw = await fetch("/api/download-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary }),
      });
      const blob = await raw.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "summary.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to download PDF", variant: "destructive" });
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
    if (file && file.type === "application/pdf") handlePdfUpload(file);
    else toast({ title: "Invalid file", description: "Upload a valid PDF", variant: "destructive" });
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
          </Tabs>

          {summary && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleDownloadPdf}>Download Summary PDF</Button>
            </div>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}
