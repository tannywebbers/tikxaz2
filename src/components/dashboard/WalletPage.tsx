import { motion } from "framer-motion";
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard,
  History,
  TrendingUp,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const transactions = [
  { id: 1, type: "earn", description: "Task completed: Like video", amount: 25, date: "2 min ago" },
  { id: 2, type: "earn", description: "Task completed: Comment", amount: 50, date: "1 hour ago" },
  { id: 3, type: "spend", description: "Created ad: Fashion post", amount: -500, date: "3 hours ago" },
  { id: 4, type: "earn", description: "Task completed: Save video", amount: 35, date: "5 hours ago" },
  { id: 5, type: "purchase", description: "Purchased TikPoints", amount: 1000, date: "1 day ago" },
  { id: 6, type: "earn", description: "Task completed: Watch video", amount: 40, date: "1 day ago" },
];

export function WalletPage() {
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
                  <span className="text-5xl font-bold gradient-text">2,450</span>
                  <span className="text-xl text-muted-foreground">TikPoints</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="success" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +12.5% this week
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="gradient" size="lg">
                  <Plus className="w-5 h-5" />
                  Buy Points
                </Button>
                <Button variant="outline" size="lg">
                  <CreditCard className="w-5 h-5" />
                  Withdraw
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
              <div className="text-2xl font-bold">1,850</div>
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
              <div className="text-2xl font-bold">500</div>
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
              <div className="text-2xl font-bold">1,000</div>
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
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
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
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">{tx.date}</p>
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
