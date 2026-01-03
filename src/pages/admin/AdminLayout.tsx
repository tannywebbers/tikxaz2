import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, 
  Users, 
  FileCheck, 
  Settings,
  Brain,
  MessageSquare,
  LogOut,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/baki/stage/admin" },
  { icon: FileCheck, label: "Submissions", href: "/baki/stage/admin/submissions" },
  { icon: Users, label: "Users", href: "/baki/stage/admin/users" },
  { icon: Brain, label: "AI Config", href: "/baki/stage/admin/ai-config" },
  { icon: MessageSquare, label: "AI Prompts", href: "/baki/stage/admin/prompts" },
  { icon: Settings, label: "Settings", href: "/baki/stage/admin/settings" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, signOut } = useAuth();

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <span className="font-semibold text-neutral-100">Admin Panel</span>
              <p className="text-xs text-neutral-500">System Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between px-6">
          <h1 className="text-lg font-medium text-neutral-100">
            {navItems.find(item => item.href === location.pathname)?.label || "Admin"}
          </h1>
          <div className="text-sm text-neutral-500">
            Logged in as <span className="text-neutral-300">{user?.email}</span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
