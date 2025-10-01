import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NewsCard } from "@/components/news/news-card";
import { CategoryFilter } from "@/components/news/category-filter";
import { SummarizerModal } from "@/components/ai/summarizer-modal";
import { FakeDetectorModal } from "@/components/ai/fake-detector-modal";
import { ChatbotModal } from "@/components/ai/chatbot-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Bot, Book, Download, Sun, TrendingUp } from "lucide-react";
import type { Article } from "@shared/schema";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [summarizerOpen, setSummarizerOpen] = useState(false);
  const [fakeDetectorOpen, setFakeDetectorOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/news', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const response = await fetch(`/api/news${params}`);
      if (!response.ok) throw new Error('Failed to fetch news');
      return response.json() as Promise<Article[]>;
    }
  });

  // Refresh news every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const featuredArticle = articles[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4">
              Stay <span className="text-primary">Informed</span>,<br />
              Stay <span className="text-accent">Ahead</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your AI-powered news platform with smart summarization, fake news detection, and personalized insights.
            </p>
          </div>

          {/* Featured News Card */}
          {featuredArticle && (
            <div className="max-w-4xl mx-auto" data-testid="featured-article">
              <Card className="overflow-hidden border border-border shadow-lg">
                <div className="md:flex">
                  {featuredArticle.imageUrl && (
                    <div className="md:w-1/2">
                      <img
                        src={featuredArticle.imageUrl}
                        alt={featuredArticle.title}
                        className="w-full h-48 md:h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`${featuredArticle.imageUrl ? 'md:w-1/2' : 'w-full'} p-6`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className="bg-destructive text-destructive-foreground">
                        FEATURED
                      </Badge>
                      <span className="text-muted-foreground text-sm">
                        {featuredArticle.category} • Recent
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3 line-clamp-2">
                      {featuredArticle.title}
                    </h2>
                    {featuredArticle.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {featuredArticle.description}
                      </p>
                    )}
                    <Button
                      onClick={() => featuredArticle.url && window.open(featuredArticle.url, '_blank')}
                      data-testid="button-read-featured"
                    >
                      Read Full Article
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main News Feed */}
          <div className="lg:w-2/3">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {/* News Grid */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-12" data-testid="loading-state">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading latest news...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-state">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No articles found for this category.</p>
                </div>
              ) : (
                articles.slice(1).map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/3 space-y-6">
            {/* AI Tools Panel */}
            <Card className="p-6" data-testid="ai-tools-panel">
              <h3 className="text-lg font-semibold text-foreground mb-4">AI-Powered Tools</h3>
              <div className="space-y-3">
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => setSummarizerOpen(true)}
                  data-testid="button-open-summarizer"
                >
                  <FileText className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Article Summarizer</div>
                    <div className="text-sm opacity-80">Summarize any article or text</div>
                  </div>
                </Button>

                <Button
                  variant="secondary"
                  className="w-full justify-start bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => setFakeDetectorOpen(true)}
                  data-testid="button-open-fake-detector"
                >
                  <Shield className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Fake News Detector</div>
                    <div className="text-sm opacity-80">Verify news authenticity</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setChatbotOpen(true)}
                  data-testid="button-open-chatbot"
                >
                  <Bot className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">AI News Assistant</div>
                    <div className="text-sm opacity-80">Ask questions about news</div>
                  </div>
                </Button>
              </div>
            </Card>

            {/* Trending Topics */}
            <Card className="p-6" data-testid="trending-topics">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trending Topics</h3>
              <div className="space-y-3">
                {[
                  { rank: 1, topic: "Climate Summit 2024", discussions: "2.3K" },
                  { rank: 2, topic: "Space Exploration", discussions: "1.8K" },
                  { rank: 3, topic: "AI Ethics Debate", discussions: "1.5K" }
                ].map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="text-accent font-bold text-sm">#{item.rank}</span>
                    <div>
                      <div className="font-medium text-foreground">{item.topic}</div>
                      <div className="text-sm text-muted-foreground">{item.discussions} discussions</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* TNPSC Resources Preview */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10" data-testid="tnpsc-preview">
              <h3 className="text-lg font-semibold text-foreground mb-4">TNPSC Resources</h3>
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-3">
                  <Book className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Latest Syllabus</div>
                    <div className="text-sm text-muted-foreground">Updated for 2024</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-accent" />
                  <div>
                    <div className="font-medium text-foreground">Study Materials</div>
                    <div className="text-sm text-muted-foreground">500+ resources</div>
                  </div>
                </div>
              </div>
              <Button 
                className="w-full"
                onClick={() => window.location.href = '/tnpsc'}
                data-testid="button-explore-tnpsc"
              >
                Explore Resources
              </Button>
            </Card>

            {/* Weather Widget */}
            <Card className="p-6" data-testid="weather-widget">
              <h3 className="text-lg font-semibold text-foreground mb-4">Weather Update</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">28°C</div>
                  <div className="text-muted-foreground">Chennai</div>
                </div>
                <div className="text-right">
                  <Sun className="w-8 h-8 text-accent mb-1" />
                  <div className="text-sm text-muted-foreground">Sunny</div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />

      {/* AI Tool Modals */}
      <SummarizerModal open={summarizerOpen} onOpenChange={setSummarizerOpen} />
      <FakeDetectorModal open={fakeDetectorOpen} onOpenChange={setFakeDetectorOpen} />
      <ChatbotModal open={chatbotOpen} onOpenChange={setChatbotOpen} />
    </div>
  );
}
