import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PIN_UNLOCK_KEY = "sb_pin_unlocked_ts";
const PIN_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

interface PinLockGateProps {
  children: React.ReactNode;
}

type FlowStep = "enter" | "confirm" | "forgot" | "reset-new" | "reset-confirm";

/**
 * Wraps owner-only settings pages behind a 4-digit PIN.
 * PIN is stored in platform_config (config_key = 'owner_pin_<hotelId>').
 * First-time setup: if no PIN exists yet, prompts owner to create one.
 * Forgot PIN: re-verify account password to reset.
 */
const PinLockGate = ({ children }: PinLockGateProps) => {
  const { hotelId, user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<FlowStep>("enter");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Check if already unlocked recently
  useEffect(() => {
    const ts = sessionStorage.getItem(PIN_UNLOCK_KEY);
    if (ts && Date.now() - Number(ts) < PIN_VALIDITY_MS) {
      setUnlocked(true);
    }
  }, []);

  // Fetch existing PIN
  useEffect(() => {
    if (!hotelId || unlocked) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("platform_config")
        .select("config_value")
        .eq("config_key", `owner_pin_${hotelId}`)
        .maybeSingle();
      if (data?.config_value) {
        setStoredPin(data.config_value);
      } else {
        setIsSetup(true);
      }
      setLoading(false);
    })();
  }, [hotelId, unlocked]);

  const grantAccess = useCallback(() => {
    sessionStorage.setItem(PIN_UNLOCK_KEY, String(Date.now()));
    setUnlocked(true);
  }, []);

  const handleUnlock = useCallback(() => {
    if (pin === storedPin) {
      grantAccess();
      toast.success("Access granted");
    } else {
      toast.error("Incorrect PIN");
      setPin("");
    }
  }, [pin, storedPin, grantAccess]);

  const handleSetup = useCallback(async () => {
    if (step === "enter" || step === "reset-new") {
      if (pin.length !== 4) { toast.error("Enter a 4-digit PIN"); return; }
      setConfirmPin(pin);
      setPin("");
      setStep(step === "reset-new" ? "reset-confirm" : "confirm");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match. Try again.");
      setPin("");
      setStep(step === "reset-confirm" ? "reset-new" : "enter");
      setConfirmPin("");
      return;
    }

    // Save or update PIN
    if (storedPin) {
      // Update existing
      const { error } = await supabase
        .from("platform_config")
        .update({ config_value: pin } as any)
        .eq("config_key", `owner_pin_${hotelId}`);
      if (error) {
        toast.error("Could not update PIN");
        return;
      }
    } else {
      const { error } = await supabase.from("platform_config").insert({
        config_key: `owner_pin_${hotelId}`,
        config_value: pin,
      });
      if (error) {
        toast.error("Could not save PIN. Please ask your admin to set it up.");
        return;
      }
    }

    setStoredPin(pin);
    setIsSetup(false);
    grantAccess();
    toast.success(storedPin ? "PIN reset successfully! Access granted." : "Security PIN created & access granted");
  }, [pin, confirmPin, step, hotelId, storedPin, grantAccess]);

  const handleForgotPin = () => {
    setStep("forgot");
    setPin("");
    setPassword("");
  };

  const handlePasswordVerify = async () => {
    if (!password || !user?.email) {
      toast.error("Please enter your account password");
      return;
    }
    setVerifying(true);
    try {
      // Re-authenticate by signing in with the same credentials
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) {
        toast.error("Incorrect password. Please try again.");
        setPassword("");
        setVerifying(false);
        return;
      }
      // Password verified — proceed to reset
      toast.success("Identity verified! Set your new PIN.");
      setPassword("");
      setPin("");
      setStep("reset-new");
      setIsSetup(true);
    } catch {
      toast.error("Verification failed");
    }
    setVerifying(false);
  };

  const goBack = () => {
    setStep("enter");
    setPin("");
    setPassword("");
    setIsSetup(!!storedPin ? false : true);
  };

  if (unlocked) return <>{children}</>;
  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  const getTitle = () => {
    if (step === "forgot") return "Verify Your Identity";
    if (step === "reset-new") return "Set New PIN";
    if (step === "reset-confirm") return "Confirm New PIN";
    if (isSetup) return step === "enter" ? "Create Security PIN" : "Confirm PIN";
    return "Enter Security PIN";
  };

  const getDescription = () => {
    if (step === "forgot") return "Enter your account password to verify your identity and reset your PIN.";
    if (step === "reset-new") return "Choose a new 4-digit security PIN.";
    if (step === "reset-confirm") return "Re-enter your new PIN to confirm.";
    if (isSetup) return step === "enter"
      ? "Set a 4-digit PIN to protect owner settings on shared devices."
      : "Re-enter your PIN to confirm.";
    return "Enter your 4-digit PIN to access owner settings.";
  };

  const getIcon = () => {
    if (step === "forgot") return <KeyRound className="h-8 w-8 text-primary" />;
    if (step === "reset-new" || step === "reset-confirm") return <ShieldCheck className="h-8 w-8 text-primary" />;
    return isSetup ? <ShieldCheck className="h-8 w-8 text-primary" /> : <Lock className="h-8 w-8 text-primary" />;
  };

  const showForgotButton = !isSetup && step === "enter" && storedPin;
  const showBackButton = step === "forgot" || step === "reset-new" || step === "reset-confirm";
  const isSetupFlow = isSetup || step === "reset-new" || step === "reset-confirm";

  return (
    <Dialog open modal>
      <DialogContent className="glass-card sm:max-w-md border-primary/20" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center items-center">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            {getIcon()}
          </div>
          <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {step === "forgot" ? (
            <>
              <Input
                type="password"
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordVerify()}
                className="max-w-[280px] text-center"
                autoFocus
              />
              <Button
                className="w-full max-w-[200px]"
                disabled={!password || verifying}
                onClick={handlePasswordVerify}
              >
                {verifying ? "Verifying..." : "Verify & Reset PIN"}
              </Button>
            </>
          ) : (
            <>
              <InputOTP maxLength={4} value={pin} onChange={setPin}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>

              <Button
                className="w-full max-w-[200px]"
                disabled={pin.length !== 4}
                onClick={isSetupFlow ? handleSetup : handleUnlock}
              >
                {isSetupFlow
                  ? (step === "enter" || step === "reset-new" ? "Next" : "Set PIN")
                  : "Unlock"}
              </Button>

              {showForgotButton && (
                <button
                  onClick={handleForgotPin}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                >
                  Forgot PIN?
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinLockGate;