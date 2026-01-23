import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, 
  Users, 
  FileCheck, 
  Settings,
  Brain,
  MessageSquare,
  LogOut,
  Shield,
  Globe,
  Mail,
  Megaphone,
  Menu,
  X,
  Palette,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/baki/stage/admin" },
  { icon: FileCheck, label: "Submissions", href: "/baki/stage/admin/submissions" },
  { icon: Users, label: "Users", href: "/baki/stage/admin/users" },
  { icon: MessageSquare, label: "Live Chats", href: "/baki/stage/admin/live-chats" },
  { icon: Shield, label: "Moderators", href: "/baki/stage/admin/moderators" },
  { icon: Brain, label: "AI Config", href: "/baki/stage/admin/ai-config" },
  { icon: MessageSquare, label: "AI Prompts", href: "/baki/stage/admin/prompts" },
  { icon: Eye, label: "Visual Editor", href: "/baki/stage/admin/visual-editor" },
  { icon: Globe, label: "Landing CMS", href: "/baki/stage/admin/landing" },
  { icon: Palette, label: "App Settings", href: "/baki/stage/admin/app-settings" },
  { icon: Mail, label: "Email Config", href: "/baki/stage/admin/email" },
  { icon: Megaphone, label: "Ads Settings", href: "/baki/stage/admin/ads" },
  { icon: Settings, label: "Settings", href: "/baki/stage/admin/settings" },
];

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  
  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate("/baki/stage/admin/login");
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/baki/stage/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">Admin Panel</span>
              <p className="text-xs text-muted-foreground">System Management</p>
            </div>
          </div>
        </div>

        <NavContent />

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-4">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
          {/* Mobile Menu */}
          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold">Admin Panel</span>
                      <p className="text-xs text-muted-foreground">System Management</p>
                    </div>
                  </div>
                </div>
                <NavContent onItemClick={() => setMobileOpen(false)} />
                <div className="p-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <h1 className="text-lg font-medium truncate">
            {navItems.find(item => item.href === location.pathname)?.label || "Admin"}
          </h1>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm text-muted-foreground">
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}