import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LiveChat } from "@/components/LiveChat";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard, { DashboardLayout } from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import CreateAd from "./pages/CreateAd";
import TaskBrowser from "./pages/TaskBrowser";
import MyAds from "./pages/MyAds";
import Referrals from "./pages/Referrals";
import NotFound from "./pages/NotFound";

// Legal & Info pages
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiesPolicy from "./pages/CookiesPolicy";
import FAQs from "./pages/FAQs";
import ContactUs from "./pages/ContactUs";

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
import AdminVisualEditor from "./pages/admin/AdminVisualEditor";
import AdminAppSettings from "./pages/admin/AdminAppSettings";
import AdminLiveChats from "./pages/admin/AdminLiveChats";
import AdminModerators from "./pages/admin/AdminModerators";
import Admin2FASettings from "./pages/admin/Admin2FASettings";
import AdminVerify2FA from "./pages/admin/AdminVerify2FA";
import AdminBonusSettings from "./pages/admin/AdminBonusSettings";

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
              
              {/* Legal & Info pages */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiesPolicy />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/contact" element={<ContactUs />} />
              
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
                <Route path="referrals" element={<Referrals />} />
              </Route>

              {/* Hidden admin routes - completely isolated */}
              <Route path="/baki/stage/admin/login" element={<AdminLogin />} />
              <Route path="/baki/stage/admin/verify-2fa" element={<AdminVerify2FA />} />
              <Route path="/baki/stage/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="submissions" element={<AdminSubmissions />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="live-chats" element={<AdminLiveChats />} />
                <Route path="moderators" element={<AdminModerators />} />
                <Route path="ai-config" element={<AdminAIConfig />} />
                <Route path="prompts" element={<AdminPrompts />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="2fa" element={<Admin2FASettings />} />
                <Route path="landing" element={<AdminLandingCMS />} />
                <Route path="visual-editor" element={<AdminVisualEditor />} />
                <Route path="app-settings" element={<AdminAppSettings />} />
                <Route path="email" element={<AdminEmailConfig />} />
                <Route path="ads" element={<AdminAdsSettings />} />
                <Route path="bonus" element={<AdminBonusSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Global Live Chat */}
            <LiveChat />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
