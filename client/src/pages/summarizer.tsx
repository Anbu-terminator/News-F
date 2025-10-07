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
import { FileText, Link, Upload, Youtube, Loader2, CheckCircle, Download } from "lucide-react";

export default function Summarizer() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "url" | "pdf" | "youtube">("text");
  const [isDragging, setIsDragging] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState<File | null>(null);
  const [pdfDownloadLink, setPdfDownloadLink] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (activeTab === "pdf" && pdfUploaded) {
      setLoading(true);
      try {
        // Create local download link
        const link = URL.createObjectURL(pdfUploaded);
        setPdfDownloadLink(link);
        setSummary("Your uploaded PDF is ready for download below.");
        toast({ title: "PDF ready", description: "Uploaded PDF is available for download." });
      } catch (err: any) {
        console.error("PDF handling error:", err);
        setErrorMsg("Failed to process PDF.");
        toast({ title: "Error", description: "Failed to process PDF", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      toast({
        title: "Upload required",
        description: "Please upload a PDF file to generate a downloadable link.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setInputText("");
    setSummary("");
    setErrorMsg("");
    setPdfUploaded(null);
    setPdfDownloadLink(null);
  };

  const handlePdfUpload = (file: File) => {
    setPdfUploaded(file);
    setInputText(file.name);
    toast({ title: "PDF loaded", description: "PDF uploaded successfully" });
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
    else toast({ title: "Invalid file", description: "Upload a valid PDF file", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">PDF Uploader</h1>
          <p className="text-lg text-muted-foreground">
            Upload a PDF and instantly get a downloadable link.
          </p>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text</TabsTrigger>
              <TabsTrigger value="pdf"><Upload className="w-4 h-4 mr-2" />PDF</TabsTrigger>
              <TabsTrigger value="url"><Link className="w-4 h-4 mr-2" />URL</TabsTrigger>
              <TabsTrigger value="youtube"><Youtube className="w-4 h-4 mr-2" />YouTube</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="pdf">
                <motion.div
                  onDragEnter={(e) => handleDrag(e, true)}
                  onDragOver={(e) => handleDrag(e, true)}
                  onDragLeave={(e) => handleDrag(e, false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : pdfUploaded
                      ? "border-green-500 bg-green-50"
                      : "border-border hover:border-primary/70 hover:bg-muted/50"
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
            </div>
          </Tabs>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <Button onClick={handleGenerate} disabled={loading || !pdfUploaded}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                "Generate Download Link"
              )}
            </Button>
          </div>
        </Card>

        {(summary || errorMsg) && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <div className="bg-muted p-4 rounded-lg space-y-4">
              {summary && (
                <>
                  <p className="whitespace-pre-wrap text-muted-foreground">{summary}</p>
                  {pdfDownloadLink && (
                    <a
                      href={pdfDownloadLink}
                      download={pdfUploaded?.name || "download.pdf"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Uploaded PDF
                    </a>
                  )}
                </>
              )}
              {errorMsg && <p className="text-red-500">{errorMsg}</p>}
            </div>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
