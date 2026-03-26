import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";

type AuthMode = "login" | "signup";
type RoleChoice = "owner" | "waiter" | "chef";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleChoice>("owner");
  const [hotelCode, setHotelCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Enter email and password"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !password || !fullName) { toast.error("Fill all fields"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      // If waiter, link to hotel after signup
      if (role === "waiter" && hotelCode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: linkError } = await supabase.rpc("link_waiter_to_hotel", {
            _user_id: user.id,
            _hotel_code: hotelCode,
          });
          if (linkError) toast.error("Could not link to hotel: " + linkError.message);
        }
      }
      toast.success("Account created! Check your email to verify, or sign in directly.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("Enter your email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent!");
    setLoading(false);
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm glass-card p-6 space-y-4 animate-pop-in">
          <div className="text-center space-y-1">
            <UtensilsCrossed className="h-8 w-8 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
          </div>
          <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Button className="w-full" onClick={handleForgotPassword} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
          <button className="text-sm text-primary w-full text-center" onClick={() => setForgotMode(false)}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm glass-card p-6 space-y-5 animate-pop-in">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-text-violet">Speedo Bill</h1>
          </div>
          <p className="text-xs text-muted-foreground">Canteen & Hotel Billing Management</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            onClick={() => setMode("login")}
          >Sign In</button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            onClick={() => setMode("signup")}
          >Sign Up</button>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <>
              <Input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
              <div className="space-y-1.5">
                <label className="label-caps">I am a</label>
                <div className="flex gap-2">
                  {(["owner", "waiter", "chef"] as RoleChoice[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        role === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
              {role === "waiter" && (
                <Input placeholder="Hotel Code (e.g. QB-1234)" value={hotelCode} onChange={e => setHotelCode(e.target.value)} />
              )}
            </>
          )}

          <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <div className="relative">
            <Input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {mode === "login" && (
            <button className="text-xs text-primary" onClick={() => setForgotMode(true)}>
              Forgot password?
            </button>
          )}

          <Button className="w-full" onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
};

export default Auth;
