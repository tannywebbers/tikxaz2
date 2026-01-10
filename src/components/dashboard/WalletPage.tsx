import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard,
  History,
  TrendingUp,
  Plus,
  Loader2,
  Coins,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Paystack pricing: 10 TikPoints = ₦5
const POINTS_PER_NAIRA = 2; // 10 points / 5 naira = 2 points per naira
const MIN_POINTS = 100;
const MAX_POINTS = 100000;

interface Transaction {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  created_at: string;
}

export function WalletPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    earned: 0,
    spent: 0,
    purchased: 0
  });
  
  // Buy points modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [pointsToBuy, setPointsToBuy] = useState(1000);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const priceInNaira = Math.ceil(pointsToBuy / POINTS_PER_NAIRA);

  // Handle payment callback
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const pointsPurchased = searchParams.get("points");
    
    if (paymentStatus === "success") {
      toast({
        title: "Payment Successful! 🎉",
        description: pointsPurchased 
          ? `${pointsPurchased} TikPoints have been added to your wallet.`
          : "Your TikPoints have been added to your wallet.",
      });
      // Clear the query params
      setSearchParams({});
      // Refresh wallet data
      if (user) {
        fetchWalletData();
        refreshProfile?.();
      }
    } else if (paymentStatus === "failed" || paymentStatus === "error") {
      const reason = searchParams.get("reason");
      toast({
        title: "Payment Failed",
        description: reason 
          ? `Payment could not be processed: ${reason}`
          : "Payment could not be processed. Please try again.",
        variant: "destructive"
      });
      setSearchParams({});
    }
  }, [searchParams]);

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
    setShowBuyModal(true);
  };
  
  const initiatePaystackPayment = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive"
      });
      return;
    }

    setIsPurchasing(true);
    
    try {
      // Call edge function to initialize Paystack payment
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          email: user.email,
          amount: priceInNaira * 100, // Paystack expects amount in kobo
          points: pointsToBuy,
          userId: user.id,
        }
      });

      if (error) throw error;

      if (data?.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: "Could not initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPurchasing(false);
    }
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
        <Card variant="elevated" className="overflow-hidden relative">
          {/* Background gradient - non-interactive */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20 pointer-events-none" />
          <CardContent className="relative p-8 z-10">
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

      {/* Buy Points Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Buy TikPoints
            </DialogTitle>
            <DialogDescription>
              Purchase TikPoints to create ads and boost your content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Points selector */}
            <div className="space-y-3">
              <Label>Select Amount</Label>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2500, 5000, 10000, 25000].map((amount) => (
                  <Button
                    key={amount}
                    variant={pointsToBuy === amount ? "default" : "outline"}
                    className="h-auto py-3"
                    onClick={() => setPointsToBuy(amount)}
                  >
                    <div className="text-center">
                      <div className="font-bold">{amount.toLocaleString()}</div>
                      <div className="text-xs opacity-70">pts</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-2">
              <Label htmlFor="customPoints">Or enter custom amount</Label>
              <Input
                id="customPoints"
                type="number"
                min={MIN_POINTS}
                max={MAX_POINTS}
                value={pointsToBuy}
                onChange={(e) => setPointsToBuy(Math.max(MIN_POINTS, Math.min(MAX_POINTS, parseInt(e.target.value) || MIN_POINTS)))}
              />
              <input
                type="range"
                min={MIN_POINTS}
                max={MAX_POINTS}
                step={100}
                value={pointsToBuy}
                onChange={(e) => setPointsToBuy(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Price display */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Points</span>
                <span className="font-bold">{pointsToBuy.toLocaleString()} TikPoints</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Rate</span>
                <span className="text-sm">10 pts = ₦5</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">₦{priceInNaira.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Pay button */}
            <Button 
              variant="gradient" 
              className="w-full" 
              size="lg"
              onClick={initiatePaystackPayment}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay ₦{priceInNaira.toLocaleString()} with Paystack
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Paystack
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
