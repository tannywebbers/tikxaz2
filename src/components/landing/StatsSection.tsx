import { motion } from "framer-motion";
import { Coins, Zap, Shield, TrendingUp, LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
}

const defaultStats: Stat[] = [
  { label: "Active Users", value: "50K+", icon: TrendingUp },
  { label: "Tasks Completed", value: "2M+", icon: Zap },
  { label: "Points Exchanged", value: "100M+", icon: Coins },
  { label: "AI Verified", value: "99.9%", icon: Shield },
];

interface StatsContent {
  title: string;
  subtitle: string;
  content: string;
  is_visible: boolean;
}

interface StatsSectionProps {
  content?: StatsContent;
}

export function StatsSection({ content }: StatsSectionProps) {
  const [statsContent, setStatsContent] = useState<StatsContent | null>(content || null);

  useEffect(() => {
    if (!content) {
      const fetchContent = async () => {
        const { data } = await supabase
          .from("landing_content")
          .select("*")
          .eq("section_key", "stats")
          .maybeSingle();
        
        if (data) {
          setStatsContent({
            title: data.title || "Our Stats",
            subtitle: data.subtitle || "Join our growing community",
            content: data.content || "",
            is_visible: data.is_visible,
          });
        }
      };
      fetchContent();
    }
  }, [content]);

  const displayContent = statsContent || {
    title: "Our Stats",
    subtitle: "Join our growing community",
    content: "",
    is_visible: true,
  };

  // Parse stats from content if available (JSON format)
  let stats = defaultStats;
  if (displayContent.content) {
    try {
      const parsed = JSON.parse(displayContent.content);
      if (Array.isArray(parsed)) {
        const icons = [TrendingUp, Zap, Coins, Shield];
        stats = parsed.map((s: any, i: number) => ({
          label: s.label || defaultStats[i]?.label || "Stat",
          value: s.value || defaultStats[i]?.value || "0",
          icon: icons[i % 4],
        }));
      }
    } catch {
      // Content is not JSON, try to parse as simple text with values
      // Format: "50K+ Active Users, 2M+ Tasks"
      const parts = displayContent.content.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        const icons = [TrendingUp, Zap, Coins, Shield];
        stats = parts.slice(0, 4).map((part, i) => {
          // Try to extract value and label
          const match = part.match(/^([\d.]+[KMB+%]*)\s*(.+)$/i);
          if (match) {
            return {
              value: match[1],
              label: match[2],
              icon: icons[i % 4],
            };
          }
          return {
            value: part,
            label: defaultStats[i]?.label || "Stat",
            icon: icons[i % 4],
          };
        });
      }
    }
  }

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        {displayContent.title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              {displayContent.title}
            </h2>
            {displayContent.subtitle && (
              <p className="text-muted-foreground">{displayContent.subtitle}</p>
            )}
          </motion.div>
        )}
        
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
