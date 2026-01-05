import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Coins, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AtSign,
  ArrowRight,
  AlertTriangle,
  Loader2,
  User,
  MapPin
} from "lucide-react";
import { getCountryFromIP } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  tiktokName: z.string().min(1, "TikTok Display Name is required"),
  tiktokUsername: z.string().min(2, "TikTok username must be at least 2 characters").regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and dots"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    tiktokName: "",
    tiktokUsername: "",
    password: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [detectingCountry, setDetectingCountry] = useState(true);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Auto-detect country on mount
  useEffect(() => {
    getCountryFromIP().then(country => {
      setDetectedCountry(country);
      setDetectingCountry(false);
    });
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      tiktok_username: formData.tiktokUsername,
      tiktok_name: formData.tiktokName,
      country: detectedCountry,
    });
    setIsLoading(false);

    if (!error) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background - pointer-events-none to prevent click blocking */}
      <div className="absolute inset-0 bg-background pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 70% 20%, hsl(330 90% 60% / 0.15) 0%, transparent 50%),
                            radial-gradient(ellipse at 30% 80%, hsl(180 80% 50% / 0.1) 0%, transparent 40%)`
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Coins className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">TikPoints</span>
        </Link>

        <Card variant="glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join TikPoints and start earning today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                  />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                  />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {/* TikTok Display Name - CRITICAL */}
              <div className="space-y-2">
                <Label htmlFor="tiktokName" className="flex items-center gap-2">
                  TikTok Display Name
                  <Badge variant="destructive" className="text-xs">Cannot Change</Badge>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="tiktokName" 
                    placeholder="Your TikTok Name (as shown on profile)"
                    className="pl-10"
                    value={formData.tiktokName}
                    onChange={(e) => handleChange("tiktokName", e.target.value)}
                  />
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-xs text-warning flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Important:</strong> Your TikTok Display Name must exactly match your TikTok profile. 
                      This is used to verify your comments and <strong>cannot be changed later</strong>.
                    </span>
                  </p>
                </div>
                {errors.tiktokName && <p className="text-sm text-destructive">{errors.tiktokName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="tiktok" 
                    placeholder="your_tiktok_username"
                    className="pl-10"
                    value={formData.tiktokUsername}
                    onChange={(e) => handleChange("tiktokUsername", e.target.value)}
                  />
                </div>
                {errors.tiktokUsername && <p className="text-sm text-destructive">{errors.tiktokUsername}</p>}
              </div>

              {/* Country Detection - Auto */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Country (Auto-detected)
                </Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  {detectingCountry ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Detecting location...</span>
                    </>
                  ) : detectedCountry ? (
                    <>
                      <span className="text-sm font-medium">{detectedCountry}</span>
                      <span className="text-xs text-muted-foreground">(auto-detected)</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Location could not be detected</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="flex items-start gap-2">
                <input 
                  type="checkbox" 
                  className="rounded border-border mt-1" 
                  id="terms"
                  checked={formData.terms}
                  onChange={(e) => handleChange("terms", e.target.checked)}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the{" "}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>
              {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}

              <Button variant="gradient" className="w-full" size="lg" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
