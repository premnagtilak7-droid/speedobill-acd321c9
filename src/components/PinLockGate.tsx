import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PIN_UNLOCK_KEY = "sb_pin_unlocked_ts";
const PIN_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

interface PinLockGateProps {
  children: React.ReactNode;
}

/**
 * Wraps owner-only settings pages behind a 4-digit PIN.
 * PIN is stored in platform_config (config_key = 'owner_pin_<hotelId>').
 * First-time setup: if no PIN exists yet, prompts owner to create one.
 */
const PinLockGate = ({ children }: PinLockGateProps) => {
  const { hotelId } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");

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

  const handleUnlock = useCallback(() => {
    if (pin === storedPin) {
      sessionStorage.setItem(PIN_UNLOCK_KEY, String(Date.now()));
      setUnlocked(true);
      toast.success("Access granted");
    } else {
      toast.error("Incorrect PIN");
      setPin("");
    }
  }, [pin, storedPin]);

  const handleSetup = useCallback(async () => {
    if (step === "enter") {
      if (pin.length !== 4) { toast.error("Enter a 4-digit PIN"); return; }
      setConfirmPin(pin);
      setPin("");
      setStep("confirm");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match. Try again.");
      setPin("");
      setStep("enter");
      setConfirmPin("");
      return;
    }
    // Save PIN — use edge function or insert if policy allows
    const { error } = await supabase.from("platform_config").insert({
      config_key: `owner_pin_${hotelId}`,
      config_value: pin,
    });
    if (error) {
      // Try upsert approach
      toast.error("Could not save PIN. Please ask your admin to set it up.");
      return;
    }
    setStoredPin(pin);
    setIsSetup(false);
    sessionStorage.setItem(PIN_UNLOCK_KEY, String(Date.now()));
    setUnlocked(true);
    toast.success("Security PIN created & access granted");
  }, [pin, confirmPin, step, hotelId]);

  if (unlocked) return <>{children}</>;
  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <Dialog open modal>
      <DialogContent className="glass-card sm:max-w-md border-primary/20" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            {isSetup ? <ShieldCheck className="h-8 w-8 text-primary" /> : <Lock className="h-8 w-8 text-primary" />}
          </div>
          <DialogTitle className="text-xl">
            {isSetup ? (step === "enter" ? "Create Security PIN" : "Confirm PIN") : "Enter Security PIN"}
          </DialogTitle>
          <DialogDescription>
            {isSetup
              ? step === "enter"
                ? "Set a 4-digit PIN to protect owner settings on shared devices."
                : "Re-enter your PIN to confirm."
              : "Enter your 4-digit PIN to access owner settings."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
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
            onClick={isSetup ? handleSetup : handleUnlock}
          >
            {isSetup ? (step === "enter" ? "Next" : "Set PIN") : "Unlock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinLockGate;
