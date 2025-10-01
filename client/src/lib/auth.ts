import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private user: User | null = null;
  private token: string | null = null;

  constructor() {
    // Load auth data from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    
    if (token && user) {
      try {
        this.token = token;
        this.user = JSON.parse(user);
      } catch (error) {
        this.clearStorage();
      }
    }
  }

  private saveToStorage(user: User, token: string) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.user = user;
    this.token = token;
  }

  private clearStorage() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.user = null;
    this.token = null;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/user/login', { username, password });
    const data: AuthResponse = await response.json();
    
    this.saveToStorage(data.user, data.token);
    return data;
  }

  async signup(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/user/signup', { username, email, password });
    const data: AuthResponse = await response.json();
    
    this.saveToStorage(data.user, data.token);
    return data;
  }

  logout() {
    this.clearStorage();
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  getAuthHeader(): Record<string, string> {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }
}

export const authService = new AuthService();
