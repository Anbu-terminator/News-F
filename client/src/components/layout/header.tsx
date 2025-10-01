import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Moon, Sun, Zap, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(authService.getUser());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => setUser(authService.getUser());
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  const handleSignOut = () => {
    authService.logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  const navItems = [
    { href: "/", label: "Home", active: location === "/" },
    { href: "/summarizer", label: "Summarizer", active: location === "/summarizer" },
    { href: "/fake-detector", label: "Fake News Detector", active: location === "/fake-detector" },
    { href: "/chatbot", label: "AI Chatbot", active: location === "/chatbot" },
    { href: "/tnpsc", label: "TNPSC Resources", active: location === "/tnpsc" },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" data-testid="logo-link">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="text-primary-foreground h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">FlashPress</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">News</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  item.active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-primary"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="text-muted-foreground hover:text-primary"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-foreground hidden sm:inline">
                  Welcome, {user.username}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  data-testid="button-sign-out"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button size="sm" data-testid="button-sign-in">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="lg:hidden"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-lg transition-colors ${
                        item.active
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                      onClick={() => setIsOpen(false)}
                      data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
