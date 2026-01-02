import { motion } from "framer-motion";
import { Coins, Zap, Shield, TrendingUp } from "lucide-react";

const stats = [
  { label: "Active Users", value: "50K+", icon: TrendingUp },
  { label: "Tasks Completed", value: "2M+", icon: Zap },
  { label: "Points Exchanged", value: "100M+", icon: Coins },
  { label: "AI Verified", value: "99.9%", icon: Shield },
];

export function StatsSection() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 rounded-2xl glass"
            >
              <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
