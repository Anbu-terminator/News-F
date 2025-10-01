import { 
  type User, type InsertUser, type Article, type InsertArticle,
  type Like, type InsertLike, type Comment, type InsertComment,
  type Bookmark, type InsertBookmark, type TNPSCResource, type InsertTNPSCResource
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Articles
  getArticles(category?: string, limit?: number, offset?: number): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  searchArticles(query: string): Promise<Article[]>;

  // Likes
  getLikesByArticle(articleId: string): Promise<Like[]>;
  getUserLike(userId: string, articleId: string): Promise<Like | undefined>;
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: string, articleId: string): Promise<void>;

  // Comments
  getCommentsByArticle(articleId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Bookmarks
  getUserBookmarks(userId: string): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(userId: string, articleId: string): Promise<void>;

  // TNPSC Resources
  getTNPSCResources(type?: string, category?: string): Promise<TNPSCResource[]>;
  getTNPSCResource(id: string): Promise<TNPSCResource | undefined>;
  createTNPSCResource(resource: InsertTNPSCResource): Promise<TNPSCResource>;
  searchTNPSCResources(query: string): Promise<TNPSCResource[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private articles: Map<string, Article> = new Map();
  private likes: Map<string, Like> = new Map();
  private comments: Map<string, Comment> = new Map();
  private bookmarks: Map<string, Bookmark> = new Map();
  private tnpscResources: Map<string, TNPSCResource> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with some TNPSC resources
    const resources: InsertTNPSCResource[] = [
      {
        title: "TNPSC Prelims Syllabus 2024",
        type: "syllabus",
        category: "prelims",
        description: "Complete prelims syllabus for TNPSC Group I & II",
        filePath: "/resources/prelims-syllabus.pdf"
      },
      {
        title: "TNPSC Mains Syllabus 2024",
        type: "syllabus",
        category: "mains",
        description: "Detailed mains syllabus with paper-wise breakdown",
        filePath: "/resources/mains-syllabus.pdf"
      },
      {
        title: "Tamil Nadu History",
        type: "book",
        category: "history",
        description: "Comprehensive guide to Tamil Nadu history",
        downloadUrl: "/books/tn-history.pdf"
      },
      {
        title: "Current Affairs Monthly",
        type: "material",
        category: "current-affairs",
        description: "Monthly current affairs compilation",
        downloadUrl: "/materials/current-affairs.pdf"
      }
    ];

    resources.forEach(resource => {
      this.createTNPSCResource(resource);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Articles
  async getArticles(category?: string, limit = 20, offset = 0): Promise<Article[]> {
    let articles = Array.from(this.articles.values());
    
    if (category && category !== 'all') {
      articles = articles.filter(article => article.category === category);
    }
    
    articles.sort((a, b) => {
      const aDate = a.publishedAt || a.createdAt || new Date(0);
      const bDate = b.publishedAt || b.createdAt || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
    
    return articles.slice(offset, offset + limit);
  }

  async getArticle(id: string): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const article: Article = {
      ...insertArticle,
      id,
      createdAt: new Date()
    };
    this.articles.set(id, article);
    return article;
  }

  async searchArticles(query: string): Promise<Article[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.articles.values()).filter(article =>
      article.title.toLowerCase().includes(searchTerm) ||
      (article.description && article.description.toLowerCase().includes(searchTerm))
    );
  }

  // Likes
  async getLikesByArticle(articleId: string): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(like => like.articleId === articleId);
  }

  async getUserLike(userId: string, articleId: string): Promise<Like | undefined> {
    return Array.from(this.likes.values()).find(like => 
      like.userId === userId && like.articleId === articleId
    );
  }

  async createLike(insertLike: InsertLike): Promise<Like> {
    const id = randomUUID();
    const like: Like = {
      ...insertLike,
      id,
      createdAt: new Date()
    };
    this.likes.set(id, like);
    return like;
  }

  async deleteLike(userId: string, articleId: string): Promise<void> {
    const like = Array.from(this.likes.values()).find(l => 
      l.userId === userId && l.articleId === articleId
    );
    if (like) {
      this.likes.delete(like.id);
    }
  }

  // Comments
  async getCommentsByArticle(articleId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.articleId === articleId)
      .sort((a, b) => (a.createdAt || new Date(0)).getTime() - (b.createdAt || new Date(0)).getTime());
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: new Date()
    };
    this.comments.set(id, comment);
    return comment;
  }

  // Bookmarks
  async getUserBookmarks(userId: string): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values()).filter(bookmark => bookmark.userId === userId);
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = randomUUID();
    const bookmark: Bookmark = {
      ...insertBookmark,
      id,
      createdAt: new Date()
    };
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }

  async deleteBookmark(userId: string, articleId: string): Promise<void> {
    const bookmark = Array.from(this.bookmarks.values()).find(b => 
      b.userId === userId && b.articleId === articleId
    );
    if (bookmark) {
      this.bookmarks.delete(bookmark.id);
    }
  }

  // TNPSC Resources
  async getTNPSCResources(type?: string, category?: string): Promise<TNPSCResource[]> {
    let resources = Array.from(this.tnpscResources.values());
    
    if (type) {
      resources = resources.filter(resource => resource.type === type);
    }
    
    if (category) {
      resources = resources.filter(resource => resource.category === category);
    }
    
    return resources.sort((a, b) => (a.createdAt || new Date(0)).getTime() - (b.createdAt || new Date(0)).getTime());
  }

  async getTNPSCResource(id: string): Promise<TNPSCResource | undefined> {
    return this.tnpscResources.get(id);
  }

  async createTNPSCResource(insertResource: InsertTNPSCResource): Promise<TNPSCResource> {
    const id = randomUUID();
    const resource: TNPSCResource = {
      ...insertResource,
      id,
      createdAt: new Date()
    };
    this.tnpscResources.set(id, resource);
    return resource;
  }

  async searchTNPSCResources(query: string): Promise<TNPSCResource[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.tnpscResources.values()).filter(resource =>
      resource.title.toLowerCase().includes(searchTerm) ||
      (resource.description && resource.description.toLowerCase().includes(searchTerm))
    );
  }
}

export const storage = new MemStorage();
