import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallAppPrompt = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info(
        "To install: Open browser menu → 'Add to Home Screen' or 'Install App'",
        { duration: 6000 }
      );
      return;
    }

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        toast.success("Speedo Bill installed on your device!");
      }
      setDeferredPrompt(null);
    } catch {
      toast.error("Installation failed. Try from browser menu.");
    }
    setInstalling(false);
  };

  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Install App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isInstalled ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Speedo Bill is installed on this device</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Install Speedo Bill on your phone or tablet for instant access — works like a native app with offline support.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleInstall} disabled={installing} className="gap-2">
                <Download className="h-4 w-4" />
                {installing ? "Installing..." : "Install Speedo Bill"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                <strong>iPhone:</strong> Safari → Share → Add to Home Screen<br />
                <strong>Android:</strong> Chrome → Menu (⋮) → Install App
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
InstallAppPrompt.displayName = "InstallAppPrompt";

export default InstallAppPrompt;
