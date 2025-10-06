import { Routes, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Summarizer from "@/pages/summarizer";
import FakeNews from "@/pages/fake-news";
import Chatbot from "@/pages/chatbot";
import TNPSC from "@/pages/tnpsc";
import Auth from "@/pages/auth";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" component={Home} />
      <Route path="/summarizer" component={Summarizer} />
      <Route path="/fake-detector" component={FakeNews} />
      <Route path="/chatbot" component={Chatbot} />
      <Route path="/tnpsc" component={TNPSC} />
      <Route path="/auth" component={Auth} />
      {/* Fallback */}
      <Route path="*" component={NotFound} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="flashpress-ui-theme">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
