import { motion } from "framer-motion";
import { Brain, Eye, CheckCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Eye,
    title: "Screenshot Analysis",
    description: "Our AI scans your screenshots to detect likes, comments, saves, and views with 99.9% accuracy.",
  },
  {
    icon: Brain,
    title: "Username Matching",
    description: "Automatically verifies your TikTok username appears in comments to prevent fraud.",
  },
  {
    icon: CheckCircle,
    title: "Instant Verification",
    description: "Get verified and credited within seconds of submitting your proof.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Fraud Protection",
    description: "Advanced algorithms detect duplicate screenshots and suspicious activity.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 relative" id="features">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              AI-Powered <span className="gradient-text">Verification</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Our cutting-edge AI technology ensures every task is completed authentically. 
              No more manual reviews, no more waiting – just instant, accurate verification.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card variant="glass" className="h-full">
                    <CardContent className="p-5">
                      <feature.icon className="w-8 h-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative mx-auto max-w-sm">
              {/* Phone mockup */}
              <div className="relative bg-card rounded-[3rem] p-3 shadow-elevated border border-border">
                <div className="bg-background rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                  {/* Status bar */}
                  <div className="h-8 bg-muted flex items-center justify-between px-6">
                    <span className="text-xs text-muted-foreground">9:41</span>
                    <div className="w-20 h-5 bg-card rounded-full" />
                    <div className="flex gap-1">
                      <div className="w-4 h-2 bg-muted-foreground/50 rounded-sm" />
                      <div className="w-4 h-2 bg-muted-foreground/50 rounded-sm" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-3">
                        <CheckCircle className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <h4 className="font-semibold text-lg">Verified!</h4>
                      <p className="text-muted-foreground text-sm">Task completed successfully</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-success/10 rounded-xl border border-success/20">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm">Username matched</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-success/10 rounded-xl border border-success/20">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm">Like detected</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-success/10 rounded-xl border border-success/20">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm">Comment verified</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <div className="text-3xl font-bold gradient-text">+50</div>
                      <div className="text-muted-foreground text-sm">TikPoints Earned</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-accent/20 blur-3xl -z-10 scale-150" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
