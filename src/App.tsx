import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard, { DashboardLayout } from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import CreateAd from "./pages/CreateAd";
import TaskBrowser from "./pages/TaskBrowser";
import MyAds from "./pages/MyAds";
import NotFound from "./pages/NotFound";

// Admin imports (isolated)
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAIConfig from "./pages/admin/AdminAIConfig";
import AdminPrompts from "./pages/admin/AdminPrompts";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLandingCMS from "./pages/admin/AdminLandingCMS";
import AdminEmailConfig from "./pages/admin/AdminEmailConfig";
import AdminAdsSettings from "./pages/admin/AdminAdsSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* User dashboard routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="profile" element={<Profile />} />
                <Route path="create-ad" element={<CreateAd />} />
                <Route path="tasks" element={<TaskBrowser />} />
                <Route path="my-ads" element={<MyAds />} />
              </Route>

              {/* Hidden admin routes - completely isolated */}
              <Route path="/baki/stage/admin/login" element={<AdminLogin />} />
              <Route path="/baki/stage/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="submissions" element={<AdminSubmissions />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="ai-config" element={<AdminAIConfig />} />
                <Route path="prompts" element={<AdminPrompts />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="landing" element={<AdminLandingCMS />} />
                <Route path="email" element={<AdminEmailConfig />} />
                <Route path="ads" element={<AdminAdsSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;