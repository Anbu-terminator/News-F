import { useState, ChangeEvent } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText, Link, Upload, Youtube, Loader2 } from "lucide-react";

export default function Summarizer() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); // NEW: store error messages
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "url" | "pdf" | "youtube">("text");
  const { toast } = useToast();

  const parseApiResult = async (res: any) => {
    try {
      if (res && typeof res.json === "function" && typeof res.status === "number") {
        const parsed = await res.json();
        return { parsed, status: res.status };
      }
      return { parsed: res, status: 200 };
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
      let payloadInput = inputText;
      if (activeTab === "url" || activeTab === "youtube") {
        payloadInput = inputText.trim().replace(/\s+/g, "");
      }

      const body: Record<string, any> = {};
      if (activeTab === "text" || activeTab === "pdf") body.text = payloadInput;
      else body.input = payloadInput;
      if (activeTab === "url" || activeTab === "youtube") {
        body.url = payloadInput;
        body.text = payloadInput;
      }

      const raw = await apiRequest("POST", `/api/summarize/${activeTab}`, body, false);
      const { parsed } = await parseApiResult(raw);

      const summaryText =
        parsed?.summary ??
        parsed?.result ??
        parsed?.message ??
        (typeof parsed === "string" ? parsed : undefined) ??
        parsed?.data?.summary;

      if (summaryText && typeof summaryText === "string" && summaryText.trim().length > 0) {
        setSummary(summaryText.trim());
        toast({ title: "Summary generated!", description: "Your content has been successfully summarized" });
      } else {
        const serverMsg = parsed?.error || parsed?.message || parsed?.detail || "Invalid response from server";
        setErrorMsg(serverMsg);
        throw new Error(serverMsg);
      }
    } catch (error: any) {
      console.error("Summarizer error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setSummary("");
    setErrorMsg("");
  };

  const handlePdfUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setInputText(text);
        toast({ title: "PDF loaded", description: "PDF content copied to text area" });
      } else {
        toast({ title: "Error", description: "Failed to read PDF content", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">AI Article Summarizer</h1>
          <p className="text-lg text-muted-foreground">
            Get concise summaries of articles, PDFs, and YouTube videos using advanced AI
          </p>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "text" | "url" | "pdf" | "youtube")}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text</TabsTrigger>
             <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />PDF Text</TabsTrigger>
              <TabsTrigger value="url"><Link className="w-4 h-4 mr-2" />URL</TabsTrigger>
              <TabsTrigger value="youtube"><Youtube className="w-4 h-4 mr-2" />YouTube</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="text" className="space-y-4">
                <Label htmlFor="text-input">Enter text to summarize</Label>
                <Textarea
                  id="text-input"
                  value={inputText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                  placeholder="Paste your article text here..."
                  className="min-h-[300px] resize-none mt-2"
                />
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files && handlePdfUpload(e.target.files[0])}
                    className="mt-4"
                  />
                  <p className="text-muted-foreground mt-2">
                    PDF text will be extracted and placed in the Text tab for summarization.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <Label htmlFor="url-input">Enter article URL</Label>
                <Textarea
                  id="url-input"
                  value={inputText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                  placeholder="https://example.com/article"
                  className="min-h-[150px] resize-none mt-2"
                />
              </TabsContent>

              <TabsContent value="youtube" className="space-y-4">
                <Label htmlFor="youtube-input">Enter YouTube video URL</Label>
                <Textarea
                  id="youtube-input"
                  value={inputText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="min-h-[150px] resize-none mt-2"
                />
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end space-x-3 mt-6">
            <Button className="border border-gray-300" onClick={handleReset}>Reset</Button>
            <Button onClick={handleSummarize} disabled={loading || !inputText.trim()}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Summary"}
            </Button>
          </div>
        </Card>

        {(summary || errorMsg) && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Summary:</h2>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
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