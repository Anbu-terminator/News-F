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

interface SummarizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SummarizerModal({ open, onOpenChange }: SummarizerModalProps) {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter text or URL to summarize",
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
        description: "Your content has been successfully summarized",
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

  const handleReset = () => {
    setInputText("");
    setSummary("");
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

          {/* ✅ Added description for accessibility */}
          <DialogDescription>
            Paste text, enter a URL, upload a PDF, or provide a YouTube link to
            get an instant AI-generated summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text" data-testid="tab-text">
                <FileText className="w-4 h-4 mr-2" />
                Text
              </TabsTrigger>
              <TabsTrigger value="url" data-testid="tab-url">
                <Link className="w-4 h-4 mr-2" />
                URL
              </TabsTrigger>
              <TabsTrigger value="pdf" data-testid="tab-pdf">
                <Upload className="w-4 h-4 mr-2" />
                PDF
              </TabsTrigger>
              <TabsTrigger value="youtube" data-testid="tab-youtube">
                <Youtube className="w-4 h-4 mr-2" />
                YouTube
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label htmlFor="text-input">Enter text to summarize</Label>
                <Textarea
                  id="text-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your article text here..."
                  className="min-h-[200px] resize-none"
                  data-testid="input-text-summarize"
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="url-input">Enter article URL</Label>
                <Textarea
                  id="url-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://example.com/article"
                  className="min-h-[100px] resize-none"
                  data-testid="input-url-summarize"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Note: URL content extraction is coming soon. For now, please
                  copy and paste the article text.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  PDF upload feature coming soon
                </p>
                <p className="text-sm text-muted-foreground">
                  For now, please copy and paste the PDF text content in the Text
                  tab.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="youtube" className="space-y-4">
              <div>
                <Label htmlFor="youtube-input">Enter YouTube video URL</Label>
                <Textarea
                  id="youtube-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="min-h-[100px] resize-none"
                  data-testid="input-youtube-summarize"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Note: YouTube transcript extraction is coming soon. For now,
                  please provide the video transcript text.
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
            <Button
              variant="outline"
              onClick={handleReset}
              data-testid="button-reset-summarizer"
            >
              Reset
            </Button>
            <Button
              onClick={handleSummarize}
              disabled={loading || !inputText.trim()}
              data-testid="button-generate-summary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
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
