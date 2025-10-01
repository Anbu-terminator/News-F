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
  confidence: number;
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
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/fakecheck', {
        text: inputText
      }, false);
      
      const data = await response.json();
      setResult(data);
      
      toast({
        title: "Analysis complete!",
        description: `Content analyzed with ${Math.round(data.confidence * 100)}% confidence`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setResult(null);
  };

  const getResultColor = (isReal: boolean, confidence: number) => {
    if (confidence > 0.8) {
      return isReal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getResultIcon = (isReal: boolean, confidence: number) => {
    if (confidence > 0.8) {
      return isReal ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />;
    }
    return <Info className="w-6 h-6" />;
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Medium';
    return 'Low';
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
            Verify the authenticity of news articles using advanced AI analysis
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
              placeholder="Paste the article URL or full text for fact-checking..."
              className="min-h-[300px] resize-none mt-2"
              data-testid="input-fake-detector-text"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleReset}
              data-testid="button-reset-fake-detector"
            >
              Reset
            </Button>
            <Button
              onClick={handleCheck}
              disabled={loading || !inputText.trim()}
              data-testid="button-check-authenticity"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Check Authenticity'
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-muted mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">How it works</h3>
              <p className="text-muted-foreground">
                Our AI analyzes the content against trusted sources and fact-checking databases to determine authenticity.
                Content from trusted sources like <strong>Thanthi, Polimer, Sun TV, BBC, Reuters, and AP News</strong> is automatically marked as reliable.
                The system evaluates factors like source credibility, factual accuracy, emotional language vs factual reporting, and consistency with known facts.
              </p>
            </div>
          </div>
        </Card>

        {result && (
          <Card className="p-6" data-testid="fake-detector-result">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-3 ${getResultColor(result.isReal, result.confidence)}`}>
                  {getResultIcon(result.isReal, result.confidence)}
                  <span className="text-2xl font-bold">
                    {result.isReal ? 'Likely Real' : 'Possibly Fake'}
                  </span>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {getConfidenceLevel(result.confidence)} Confidence ({Math.round(result.confidence * 100)}%)
                </Badge>
              </div>
              
              <Card className="p-4 bg-muted">
                <h4 className="font-semibold mb-3 text-lg">Analysis:</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {result.reasoning}
                </p>
              </Card>

              {result.confidence < 0.8 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        Proceed with Caution
                      </h4>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        The confidence level is moderate. We recommend cross-referencing with multiple trusted sources 
                        before sharing or acting on this information. Always verify important news through established 
                        news outlets and fact-checking organizations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground border-t pt-4">
                <p>
                  <strong>Disclaimer:</strong> This AI analysis is for informational purposes only. 
                  Always verify important information through multiple reliable sources.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
