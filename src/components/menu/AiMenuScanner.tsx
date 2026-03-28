import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Camera, Loader2, Check } from "lucide-react";

interface Props { compact?: boolean; hotelId: string; existingCategories: string[]; onComplete: () => void; }

const AiMenuScanner = ({ compact, hotelId, onComplete }: Props) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; price: number; category: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxDim = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        // Scale down the larger dimension, preserving aspect ratio
        if (w > h) {
          if (w > maxDim) { h = Math.round((maxDim / w) * h); w = maxDim; }
        } else {
          if (h > maxDim) { w = Math.round((maxDim / h) * w); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setScanning(true);
      const compressed = await compressImage(file);
      setPreview(compressed);
      await scanImage(compressed);
    } catch (err: any) {
      toast.error("Failed to process image: " + err.message);
      setScanning(false);
    }
  };

  const scanImage = async (base64: string) => {
    setScanning(true);
    setResults([]);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-menu`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image_base64: base64 }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Scan failed");
      if (data.items?.length) {
        setResults(data.items);
        toast.success(`Found ${data.items.length} menu items!`);
      } else {
        toast.error("Could not parse menu items from image");
      }
    } catch (err: any) {
      toast.error("AI scan failed: " + err.message);
    }
    setScanning(false);
  };

  const saveAll = async () => {
    if (results.length === 0) return;
    setSaving(true);
    const inserts = results.map((r) => ({
      hotel_id: hotelId,
      name: r.name,
      price: r.price,
      category: r.category || "General",
    }));
    const { error } = await supabase.from("menu_items").insert(inserts);
    if (error) toast.error("Save failed: " + error.message);
    else {
      toast.success(`${results.length} items added to menu!`);
      onComplete();
      setOpen(false);
      setResults([]);
      setPreview(null);
    }
    setSaving(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" className={compact ? "h-8 text-xs gap-1" : "gap-1"} onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> {compact ? "AI Scan" : "AI Scanner"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Menu Scanner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

            {!preview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Take photo or upload menu image</span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden">
                <img src={preview} alt="Menu scan" className="w-full max-h-48 object-cover" />
                {scanning && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm mt-2 text-muted-foreground">Scanning with AI...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{results.length} items found:</p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-2">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/30">
                      <div>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.category}</span>
                      </div>
                      <span className="font-bold text-primary">₹{r.price}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={saveAll} disabled={saving} className="w-full gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add All to Menu
                </Button>
              </div>
            )}

            {preview && !scanning && results.length === 0 && (
              <Button variant="outline" className="w-full" onClick={() => { setPreview(null); fileRef.current?.click(); }}>
                Try another image
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiMenuScanner;
