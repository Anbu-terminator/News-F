import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";

interface FakeDetectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetectionResult {
  isReal: boolean;
  confidence: number;
  reasoning: string;
}

export function FakeDetectorModal({ open, onOpenChange }: FakeDetectorModalProps) {
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
      return isReal ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />;
    }
    return <Info className="w-5 h-5" />;
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="modal-fake-detector">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Fake News Detector</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="content-input">Article URL or Text</Label>
            <Textarea
              id="content-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the article URL or full text for fact-checking..."
              className="min-h-[200px] resize-none"
              data-testid="input-fake-detector-text"
            />
          </div>

          <Card className="p-4 bg-muted">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">How it works</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes the content against trusted sources and fact-checking databases to determine authenticity.
                  Content from trusted sources like Thanthi, Polimer, Sun TV, BBC, Reuters, and AP News is automatically marked as reliable.
                </p>
              </div>
            </div>
          </Card>

          {result && (
            <Card className="p-6" data-testid="fake-detector-result">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-2 ${getResultColor(result.isReal, result.confidence)}`}>
                    {getResultIcon(result.isReal, result.confidence)}
                    <span className="text-xl font-semibold">
                      {result.isReal ? 'Likely Real' : 'Possibly Fake'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {getConfidenceLevel(result.confidence)} Confidence ({Math.round(result.confidence * 100)}%)
                  </Badge>
                </div>
                
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium mb-2">Analysis:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.reasoning}
                  </p>
                </div>

                {result.confidence < 0.8 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-yellow-800 dark:text-yellow-200">
                          Proceed with Caution
                        </h5>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          The confidence level is moderate. We recommend cross-referencing with multiple trusted sources before sharing or acting on this information.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="flex justify-end space-x-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
