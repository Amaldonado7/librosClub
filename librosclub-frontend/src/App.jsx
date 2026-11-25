import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";

const RegaloPage = lazy(() => import('./components/regalo/RegaloPage'));

const queryClient = new QueryClient();

const AppContent = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<Dashboard />} />
      <Route
        path="/regalo"
        element={
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <RegaloPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <MotionConfig reducedMotion="user">
          <AppContent />
        </MotionConfig>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
