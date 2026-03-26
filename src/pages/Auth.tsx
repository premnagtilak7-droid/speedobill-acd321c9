import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Zap, ChefHat, BarChart3, Grid3X3, UtensilsCrossed, ScrollText } from "lucide-react";

type AuthMode = "login" | "signup";
type RoleChoice = "owner" | "waiter" | "chef";

const slides = [
  {
    icon: UtensilsCrossed,
    title: "Smart Menu Management",
    desc: "Add, edit, and organize your menu items with categories, pricing variants, and AI-powered scanning.",
  },
  {
    icon: ChefHat,
    title: "Live Kitchen Display",
    desc: "Orders appear in real-time on your kitchen screen. Zero delays.",
  },
  {
    icon: Grid3X3,
    title: "Table Management",
    desc: "Visual floor plan with real-time status updates. Track every table at a glance.",
  },
  {
    icon: BarChart3,
    title: "Powerful Analytics",
    desc: "Daily sales, revenue trends, staff performance and inventory insights.",
  },
  {
    icon: ScrollText,
    title: "Instant Billing",
    desc: "Generate GST bills in seconds. Share via WhatsApp or print thermal receipts.",
  },
];

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
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
      toast.success("Account created! You can now sign in.");
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

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Cache cleared! Reloading...");
    setTimeout(() => window.location.reload(), 800);
  };

  const currentSlide = slides[activeSlide];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side — Feature carousel (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative items-center justify-center overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #F97316, transparent 70%)" }} />
        <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #F97316, transparent 70%)" }} />

        <div className="relative z-10 max-w-md px-8 text-center space-y-8">
          {/* Logo */}
          <div className="mx-auto w-28 h-28 rounded-3xl bg-card border border-border flex items-center justify-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl gradient-btn-primary flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Slide content */}
          <div className="space-y-3 min-h-[120px]" key={activeSlide}>
            <div className="animate-pop-in">
              <h2 className="text-2xl font-bold text-foreground">{currentSlide.title}</h2>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{currentSlide.desc}</p>
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === activeSlide ? "w-6 bg-primary" : "w-2.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:border-l md:border-border relative">
        <div className="w-full max-w-sm space-y-6 animate-pop-in">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold gradient-text-orange" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              SpeedoBill
            </h1>
            <p className="text-sm text-muted-foreground">Smart Restaurant Management</p>
          </div>

          {forgotMode ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input placeholder="you@hotel.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 bg-secondary/50 border-border" />
              </div>
              <Button className="w-full h-11 gradient-btn-primary" onClick={handleForgotPassword} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <button className="text-sm text-primary w-full text-center hover:underline" onClick={() => setForgotMode(false)}>
                ← Back to Login
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    mode === "login" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setMode("login")}
                >Login</button>
                <button
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    mode === "signup" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setMode("signup")}
                >Sign Up</button>
              </div>

              <div className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-foreground">Full Name</label>
                    <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} className="h-11 bg-secondary/50 border-border" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-bold text-foreground">Email Address</label>
                  <Input placeholder="you@hotel.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 bg-secondary/50 border-border" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-foreground">Password</label>
                  <div className="relative">
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
                      className="h-11 bg-secondary/50 border-border pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-primary">I am a...</label>
                      <div className="flex gap-2">
                        {([
                          { key: "owner" as RoleChoice, icon: "👑", label: "Owner" },
                          { key: "waiter" as RoleChoice, icon: "🍽️", label: "Waiter" },
                          { key: "chef" as RoleChoice, icon: "👨‍🍳", label: "Chef" },
                        ]).map(r => (
                          <button
                            key={r.key}
                            onClick={() => setRole(r.key)}
                            className={`flex-1 py-2.5 rounded-full text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                              role === r.key
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
                                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                          >
                            <span>{r.icon}</span> {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(role === "waiter" || role === "chef") && (
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-foreground">Hotel Code</label>
                        <Input placeholder="e.g. QB-1234" value={hotelCode} onChange={e => setHotelCode(e.target.value)} className="h-11 bg-secondary/50 border-border" />
                      </div>
                    )}
                  </>
                )}

                <Button className="w-full h-12 gradient-btn-primary text-base font-semibold rounded-xl" onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}>
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    mode === "login" ? "Sign In" : "Create Account"
                  )}
                </Button>

                {mode === "login" && (
                  <button className="text-sm text-primary w-full text-center hover:underline font-medium" onClick={() => setForgotMode(true)}>
                    Forgot Password?
                  </button>
                )}
              </div>

              {/* Footer links */}
              <div className="text-center space-y-3 pt-2">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                  <span>•</span>
                  <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a>
                  <span>•</span>
                  <a href="/support" className="text-primary hover:underline">Support</a>
                </div>
                <button
                  onClick={handleClearCache}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto"
                >
                  🔄 Reset App (Clear Cache)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
