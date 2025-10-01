import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authService } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Book, Download, Search, Bookmark, BookOpen, FileText, GraduationCap } from "lucide-react";
import type { TNPSCResource } from "@shared/schema";

export default function TNPSC() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['/api/tnpsc/resources', selectedType !== 'all' ? selectedType : undefined, selectedCategory !== 'all' ? selectedCategory : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await fetch(`/api/tnpsc/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch TNPSC resources');
      return response.json() as Promise<TNPSCResource[]>;
    }
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/tnpsc/resources/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/tnpsc/resources/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search TNPSC resources');
      return response.json() as Promise<TNPSCResource[]>;
    },
    enabled: !!searchQuery.trim()
  });

  const displayResources = searchQuery.trim() ? searchResults : resources;

  const handleBookmark = async (resourceId: string) => {
    if (!authService.isAuthenticated()) {
      toast({
        title: "Authentication required",
        description: "Please sign in to bookmark resources",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/user/bookmark', {
        resourceType: 'tnpsc_resource',
        resourceData: { resourceId }
      });
      
      toast({
        title: "Bookmarked!",
        description: "Resource added to your bookmarks"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bookmark resource. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = (resource: TNPSCResource) => {
    if (resource.downloadUrl) {
      window.open(resource.downloadUrl, '_blank');
    } else if (resource.filePath) {
      window.open(resource.filePath, '_blank');
    } else {
      toast({
        title: "Download unavailable",
        description: "This resource is not available for download",
        variant: "destructive"
      });
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'syllabus':
        return <GraduationCap className="w-5 h-5" />;
      case 'book':
        return <Book className="w-5 h-5" />;
      case 'material':
        return <FileText className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      syllabus: 'bg-primary text-primary-foreground',
      book: 'bg-accent text-accent-foreground',
      material: 'bg-secondary text-secondary-foreground'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const syllabusData = [
    {
      stage: "Prelims",
      papers: [
        {
          name: "General Studies",
          topics: [
            "History of India and Tamil Nadu",
            "Geography of India and Tamil Nadu", 
            "Indian Polity and Governance",
            "Economic and Social Development",
            "General Science",
            "Current Affairs"
          ]
        }
      ]
    },
    {
      stage: "Mains",
      papers: [
        {
          name: "Paper I - General Studies",
          topics: [
            "History and Culture of India with special reference to Tamil Nadu",
            "Geography of India and Tamil Nadu",
            "Constitution of India and Indian Polity",
            "Economic and Social Development in India and Tamil Nadu"
          ]
        },
        {
          name: "Paper II - General Studies",
          topics: [
            "Science and Technology",
            "Environment and Ecology",
            "Disaster Management",
            "Internal Security and Law & Order",
            "General Mental Ability and Quantitative Aptitude"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            <GraduationCap className="w-8 h-8 inline mr-2" />
            TNPSC Resources
          </h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive study materials, syllabus, and books for TNPSC preparation
          </p>
        </div>

        <Tabs defaultValue="syllabus" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="syllabus" data-testid="tab-syllabus">
              <GraduationCap className="w-4 h-4 mr-2" />
              Syllabus
            </TabsTrigger>
            <TabsTrigger value="resources" data-testid="tab-resources">
              <Book className="w-4 h-4 mr-2" />
              Study Materials
            </TabsTrigger>
            <TabsTrigger value="bookmarks" data-testid="tab-bookmarks">
              <Bookmark className="w-4 h-4 mr-2" />
              My Bookmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="syllabus" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">TNPSC Exam Syllabus 2024</h2>
              
              <div className="space-y-8">
                {syllabusData.map((stage, stageIndex) => (
                  <div key={stageIndex}>
                    <h3 className="text-xl font-semibold text-primary mb-4">{stage.stage}</h3>
                    
                    <div className="space-y-6">
                      {stage.papers.map((paper, paperIndex) => (
                        <Card key={paperIndex} className="p-4">
                          <h4 className="font-semibold mb-3">{paper.name}</h4>
                          <div className="grid gap-2">
                            {paper.topics.map((topic, topicIndex) => (
                              <div key={topicIndex} className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                <span className="text-muted-foreground">{topic}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            {/* Search and Filters */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search resources by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-resources"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 bg-input border border-border rounded-lg"
                    data-testid="select-resource-type"
                  >
                    <option value="all">All Types</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="book">Books</option>
                    <option value="material">Materials</option>
                  </select>
                  
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-input border border-border rounded-lg"
                    data-testid="select-resource-category"
                  >
                    <option value="all">All Categories</option>
                    <option value="prelims">Prelims</option>
                    <option value="mains">Mains</option>
                    <option value="history">History</option>
                    <option value="current-affairs">Current Affairs</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Resources Grid */}
            {isLoading || isSearching ? (
              <div className="text-center py-12" data-testid="loading-resources">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading resources...</p>
              </div>
            ) : displayResources.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-resources">
                <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No resources found matching your search.' : 'No resources available.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayResources.map((resource) => (
                  <Card key={resource.id} className="p-6 hover:shadow-lg transition-shadow" data-testid={`resource-card-${resource.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getResourceIcon(resource.type)}
                        <Badge className={getTypeColor(resource.type)}>
                          {resource.type.toUpperCase()}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBookmark(resource.id)}
                        data-testid={`button-bookmark-${resource.id}`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {resource.title}
                    </h3>
                    
                    {resource.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {resource.description}
                      </p>
                    )}
                    
                    {resource.category && (
                      <Badge variant="outline" className="mb-4">
                        {resource.category}
                      </Badge>
                    )}
                    
                    <Button
                      onClick={() => handleDownload(resource)}
                      className="w-full"
                      disabled={!resource.downloadUrl && !resource.filePath}
                      data-testid={`button-download-${resource.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks">
            <Card className="p-6 text-center">
              <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Bookmarks Feature</h3>
              <p className="text-muted-foreground mb-4">
                {authService.isAuthenticated() 
                  ? "Your bookmarked resources will appear here. Start bookmarking resources to build your personal study collection."
                  : "Please sign in to view and manage your bookmarked resources."
                }
              </p>
              {!authService.isAuthenticated() && (
                <Button onClick={() => window.location.href = '/auth'} data-testid="button-sign-in-bookmarks">
                  Sign In to View Bookmarks
                </Button>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
