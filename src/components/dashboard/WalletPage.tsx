import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard,
  History,
  TrendingUp,
  Plus,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  created_at: string;
}

export function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    earned: 0,
    spent: 0,
    purchased: 0
  });

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tik_points")
        .eq("user_id", user?.id)
        .single();

      if (profileError) throw profileError;
      setBalance(profile?.tik_points || 0);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (txError) throw txError;
      setTransactions(txData || []);

      // Calculate monthly stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyTx = (txData || []).filter(
        tx => new Date(tx.created_at) >= startOfMonth
      );

      const earned = monthlyTx
        .filter(tx => tx.type === "earn")
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const spent = monthlyTx
        .filter(tx => tx.type === "spend")
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      const purchased = monthlyTx
        .filter(tx => tx.type === "purchase")
        .reduce((sum, tx) => sum + tx.amount, 0);

      setStats({ earned, spent, purchased });
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPoints = () => {
    toast({
      title: "Coming Soon",
      description: "Point purchases will be available soon!"
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return format(date, "MMM d, yyyy");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="elevated" className="overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20" />
          <CardContent className="relative p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-muted-foreground mb-2">Total Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold gradient-text">{balance.toLocaleString()}</span>
                  <span className="text-xl text-muted-foreground">TikPoints</span>
                </div>
                {stats.earned > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="success" className="gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{stats.earned} this month
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button variant="gradient" size="lg" onClick={handleBuyPoints}>
                  <Plus className="w-5 h-5" />
                  Buy Points
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-success" />
                </div>
                <span className="text-muted-foreground">Earned</span>
              </div>
              <div className="text-2xl font-bold">{stats.earned.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-warning" />
                </div>
                <span className="text-muted-foreground">Spent</span>
              </div>
              <div className="text-2xl font-bold">{stats.spent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">Purchased</span>
              </div>
              <div className="text-2xl font-bold">{stats.purchased.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Complete tasks to earn TikPoints!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === "earn" ? "bg-success/10" : 
                        tx.type === "spend" ? "bg-warning/10" : "bg-primary/10"
                      }`}>
                        {tx.type === "earn" ? (
                          <ArrowDownLeft className="w-5 h-5 text-success" />
                        ) : tx.type === "spend" ? (
                          <ArrowUpRight className="w-5 h-5 text-warning" />
                        ) : (
                          <CreditCard className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description || tx.type}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      tx.amount > 0 ? "text-success" : "text-warning"
                    }`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
