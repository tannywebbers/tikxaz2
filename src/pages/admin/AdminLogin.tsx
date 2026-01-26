import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const MAX_ATTEMPTS = 3;
const LOCKOUT_HOURS = 6;

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<Date | null>(null);
  
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Only redirect if already logged in AND not in 2FA flow
  useEffect(() => {
    if (!authLoading && user && isAdmin && !show2FA) {
      navigate("/baki/stage/admin");
    }
  }, [user, isAdmin, authLoading, navigate, show2FA]);

  // Check lockout status
  const checkLockout = async (userId: string) => {
    const { data: totpData } = await supabase
      .from("admin_totp_secrets")
      .select("locked_until, failed_attempts")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (totpData?.locked_until) {
      const lockedUntil = new Date(totpData.locked_until);
      if (lockedUntil > new Date()) {
        setIsLocked(true);
        setLockUntil(lockedUntil);
        return true;
      }
    }
    setFailedAttempts(totpData?.failed_attempts || 0);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthError("");

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    
    // First authenticate with Supabase
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setIsLoading(false);
      setAuthError("Invalid credentials");
      return;
    }

    if (!authData.user) {
      setIsLoading(false);
      setAuthError("Authentication failed");
      return;
    }

    // Check if user is admin or moderator
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setAuthError("Not authorized to access admin panel");
      return;
    }

    // Check lockout
    const locked = await checkLockout(authData.user.id);
    if (locked) {
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    // Check if 2FA is enabled for this user
    const { data: totpData } = await supabase
      .from("admin_totp_secrets")
      .select("is_verified")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (totpData?.is_verified) {
      // Sign out temporarily and require 2FA
      await supabase.auth.signOut();
      setTempUserId(authData.user.id);
      setShow2FA(true);
      setIsLoading(false);
      return;
    }

    // No 2FA, proceed normally
    setIsLoading(false);
    navigate("/baki/stage/admin");
  };

  const handle2FAVerify = async () => {
    if ((totpCode.length !== 6 && totpCode.length !== 8) || !tempUserId) return;

    setIsVerifying2FA(true);
    setAuthError("");

    try {
      const { data, error } = await supabase.functions.invoke("totp-verify", {
        body: { user_id: tempUserId, code: totpCode },
      });

      if (error || !data?.success) {
        // Handle lockout
        if (data?.locked) {
          setIsLocked(true);
          setLockUntil(new Date(data.locked_until));
          setAuthError("");
        } else {
          const newAttempts = (data?.failed_attempts || failedAttempts + 1);
          setFailedAttempts(newAttempts);
          const remaining = MAX_ATTEMPTS - newAttempts;
          setAuthError(
            remaining > 0 
              ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : "Account locked. Try again later."
          );
        }
        setIsVerifying2FA(false);
        setTotpCode("");
        return;
      }

      // 2FA successful, sign in again
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setAuthError("Authentication failed");
        setIsVerifying2FA(false);
        return;
      }

      navigate("/baki/stage/admin");
    } catch (err) {
      setAuthError("Verification failed");
      setIsVerifying2FA(false);
    }
  };

  const formatLockTime = () => {
    if (!lockUntil) return "";
    const now = new Date();
    const diff = lockUntil.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto mb-4">
            {isLocked ? (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            ) : show2FA ? (
              <KeyRound className="w-8 h-8 text-neutral-300" />
            ) : (
              <Shield className="w-8 h-8 text-neutral-300" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-neutral-100">
            {isLocked ? "Account Locked" : show2FA ? "Two-Factor Authentication" : "Admin Access"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isLocked 
              ? `Try again in ${formatLockTime()}`
              : show2FA 
                ? "Enter your 6-digit code or backup code" 
                : "Restricted area"}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          {isLocked ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">
                  Too many failed attempts. Your account has been locked for security.
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full text-neutral-400"
                onClick={() => {
                  setIsLocked(false);
                  setShow2FA(false);
                  setTotpCode("");
                  setTempUserId(null);
                  setFailedAttempts(0);
                }}
              >
                Back to Login
              </Button>
            </div>
          ) : show2FA ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={8}
                  value={totpCode}
                  onChange={(value) => setTotpCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="bg-neutral-800 border-neutral-700 text-neutral-100" />
                    <InputOTPSlot index={1} className="bg-neutral-800 border-neutral-700 text-neutral-100" />
                    <InputOTPSlot index={2} className="bg-neutral-800 border-neutral-700 text-neutral-100" />
                    <InputOTPSlot index={3} className="bg-neutral-800 border-neutral-700 text-neutral-100" />
                    <InputOTPSlot index={4} className="bg-neutral-800 border-neutral-700 text-neutral-100" />
                    <InputOTPSlot index={5} className="bg-neutral-800 border-neutral-700 text-neutral-100" />
                    <InputOTPSlot index={6} className="bg-neutral-800 border-neutral-700 text-neutral-100 hidden" />
                    <InputOTPSlot index={7} className="bg-neutral-800 border-neutral-700 text-neutral-100 hidden" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-sm text-neutral-500 text-center">
                Enter the 6-digit code from your authenticator app, or an 8-character backup code
              </p>

              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{authError}</p>
                </div>
              )}

              <Button
                className="w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                disabled={(totpCode.length !== 6 && totpCode.length !== 8) || isVerifying2FA}
                onClick={handle2FAVerify}
              >
                {isVerifying2FA ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-neutral-400"
                onClick={() => {
                  setShow2FA(false);
                  setTotpCode("");
                  setTempUserId(null);
                }}
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
                    placeholder="admin@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{authError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Authenticating...
                  </>
                ) : (
                  "Access Panel"
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}