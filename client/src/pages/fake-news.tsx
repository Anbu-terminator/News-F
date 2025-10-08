import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";

interface DetectionResult {
  isReal: boolean;
  reasoning: string;
}

export default function FakeNews() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter text or URL to check",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/fakecheck", { text: inputText }, false);
      const data = await response.json();
      setResult(data);

      toast({
        title: "Analysis complete!",
        description: data.isReal ? "Trusted source found." : "No trusted source found.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to analyze content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            <Shield className="w-8 h-8 inline mr-2" />
            Fake News Detector
          </h1>
          <p className="text-lg text-muted-foreground">
            Check if content comes from trusted news sources
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div>
            <Label htmlFor="content-input" className="text-lg font-medium">
              Article URL or Text
            </Label>
            <Textarea
              id="content-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste article text or URL to verify..."
              className="min-h-[300px] resize-none mt-2"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button onClick={handleCheck} disabled={loading || !inputText.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Check Authenticity"
              )}
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center space-x-3 ${
                  result.isReal ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {result.isReal ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
                <span className="text-2xl font-bold">
                  {result.isReal ? "Real News" : "Fake News"}
                </span>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {result.isReal ? "Trusted Source" : "Unverified Source"}
              </Badge>
            </div>

            <Card className="p-4 bg-muted mt-4">
              <h4 className="font-semibold mb-3 text-lg">Details:</h4>
              <p className="text-muted-foreground leading-relaxed">{result.reasoning}</p>
            </Card>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
