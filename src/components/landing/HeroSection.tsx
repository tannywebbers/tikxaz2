import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects - pointer-events-none to prevent click blocking */}
      <div className="absolute inset-0 bg-background pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 50% 0%, hsl(330 90% 60% / 0.15) 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 50%, hsl(180 80% 50% / 0.1) 0%, transparent 40%),
                            radial-gradient(ellipse at 20% 80%, hsl(270 80% 55% / 0.1) 0%, transparent 40%)`
        }}
      />
      
      {/* Grid pattern - pointer-events-none */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="glass" className="mb-6 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered TikTok Engagement Exchange
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Earn & Grow on{" "}
            <span className="gradient-text glow-text">TikTok</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Exchange engagement for TikPoints. Complete tasks to earn, or boost your 
            content with authentic engagement from real users.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="gradient" size="xl" asChild>
              <Link to="/register">
                Start Earning Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <a href="#how-it-works">
                <Play className="w-5 h-5" />
                See How It Works
              </a>
            </Button>
          </motion.div>

          {/* Floating elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-20 relative"
          >
            <div className="flex justify-center items-end gap-4">
              {/* Mock task cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="hidden sm:block w-48 p-4 rounded-2xl glass border border-border/50 transform -rotate-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                  <div>
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-2 w-14 bg-muted/50 rounded mt-1" />
                  </div>
                </div>
                <div className="h-24 bg-muted/30 rounded-lg mb-3" />
                <div className="flex justify-between items-center">
                  <Badge variant="success" className="text-xs">+25 pts</Badge>
                  <span className="text-xs text-muted-foreground">Like</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="w-56 p-5 rounded-2xl glass border border-primary/30 shadow-glow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent" />
                  <div>
                    <div className="h-3 w-24 bg-foreground/80 rounded" />
                    <div className="h-2 w-16 bg-muted-foreground/50 rounded mt-1" />
                  </div>
                </div>
                <div className="h-32 bg-muted/30 rounded-lg mb-4 flex items-center justify-center">
                  <Play className="w-10 h-10 text-primary" />
                </div>
                <div className="flex justify-between items-center">
                  <Badge variant="gradient" className="text-xs">+50 pts</Badge>
                  <span className="text-xs text-muted-foreground">Comment</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="hidden sm:block w-48 p-4 rounded-2xl glass border border-border/50 transform rotate-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
                  <div>
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-2 w-14 bg-muted/50 rounded mt-1" />
                  </div>
                </div>
                <div className="h-24 bg-muted/30 rounded-lg mb-3" />
                <div className="flex justify-between items-center">
                  <Badge variant="success" className="text-xs">+35 pts</Badge>
                  <span className="text-xs text-muted-foreground">Save</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
