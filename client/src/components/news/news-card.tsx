import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share } from "lucide-react";
import { useState, useEffect } from "react";
import { authService } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Article } from "@shared/schema";

interface NewsCardProps {
  article: Article;
}

export function NewsCard({ article }: NewsCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchEngagementData();
  }, [article.id]);

  const fetchEngagementData = async () => {
    try {
      const likesResponse = await fetch(`/api/articles/${article.id}/likes`);
      if (likesResponse.ok) {
        const likesData = await likesResponse.json();
        setLikeCount(likesData.count);
        
        // Check if current user has liked this article
        if (authService.isAuthenticated()) {
          const currentUserId = authService.getUser()?.id;
          const userLike = likesData.likes.find((like: any) => like.userId === currentUserId);
          setLiked(!!userLike);
        }
      }

      const commentsResponse = await fetch(`/api/articles/${article.id}/comments`);
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setCommentCount(commentsData.length);
      }
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    }
  };

  const handleLike = async () => {
    if (!authService.isAuthenticated()) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like articles",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('POST', `/api/articles/${article.id}/like`);
      const data = await response.json();
      
      setLiked(data.liked);
      setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
      
      toast({
        title: data.liked ? "Article liked!" : "Like removed",
        description: data.liked ? "Added to your liked articles" : "Removed from liked articles"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle like. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description || '',
          url: article.url || window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(article.url || window.location.href);
        toast({
          title: "Link copied!",
          description: "Article link copied to clipboard"
        });
      } catch (error) {
        toast({
          title: "Share failed",
          description: "Unable to share article",
          variant: "destructive"
        });
      }
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Recently';
    
    // Ensure we have a proper Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return 'Recently';
    
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      politics: 'bg-red-500',
      technology: 'bg-blue-500',
      sports: 'bg-green-500',
      business: 'bg-orange-500',
      health: 'bg-emerald-500',
      entertainment: 'bg-purple-500',
      general: 'bg-gray-500'
    };
    return colors[category.toLowerCase()] || colors.general;
  };

  return (
    <Card className="news-card bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-200" data-testid={`news-card-${article.id}`}>
      <div className="md:flex">
        {article.imageUrl && (
          <div className="md:w-1/3">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-48 md:h-full object-cover"
              data-testid={`news-image-${article.id}`}
            />
          </div>
        )}
        <div className={`${article.imageUrl ? 'md:w-2/3' : 'w-full'} p-6`}>
          <div className="flex items-center space-x-2 mb-2">
            <Badge 
              className={`${getCategoryColor(article.category)} text-white px-2 py-1 text-xs font-medium`}
              data-testid={`badge-category-${article.category}`}
            >
              {article.category.toUpperCase()}
            </Badge>
            <span className="text-muted-foreground text-sm" data-testid={`time-published-${article.id}`}>
              {formatTimeAgo(article.publishedAt)}
            </span>
            {article.source && (
              <span className="text-muted-foreground text-sm" data-testid={`source-${article.id}`}>
                • {article.source}
              </span>
            )}
          </div>
          
          <h3 
            className="text-xl font-semibold text-foreground mb-2 hover:text-primary cursor-pointer transition-colors line-clamp-2"
            onClick={() => article.url && window.open(article.url, '_blank')}
            data-testid={`title-${article.id}`}
          >
            {article.title}
          </h3>
          
          {article.description && (
            <p className="text-muted-foreground mb-4 line-clamp-3" data-testid={`description-${article.id}`}>
              {article.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`hover:text-primary transition-colors ${liked ? 'text-red-500' : ''}`}
                data-testid={`button-like-${article.id}`}
              >
                <Heart className={`w-4 h-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                {likeCount}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-primary transition-colors"
                data-testid={`button-comment-${article.id}`}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {commentCount}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="hover:text-primary transition-colors"
                data-testid={`button-share-${article.id}`}
              >
                <Share className="w-4 h-4" />
              </Button>
            </div>
            
            {article.url && (
              <Button
                variant="link"
                size="sm"
                onClick={() => article.url && window.open(article.url, '_blank')}
                className="text-primary hover:text-primary/80 p-0"
                data-testid={`button-read-more-${article.id}`}
              >
                Read More →
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
