import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Camera, Loader2, Check, X, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PriceVariant { label: string; price: number; }
interface ScannedItem { name: string; price: number; category: string; price_variants?: PriceVariant[] | null; selected?: boolean; }
interface Props { compact?: boolean; hotelId: string; existingCategories: string[]; onComplete: () => void; }

const AiMenuScanner = ({ compact, hotelId, onComplete }: Props) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<ScannedItem[]>([]);
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
      setResults([]);
      const compressed = await compressImage(file);
      setPreview(compressed);
      await scanImage(compressed);
    } catch (err: any) {
      toast.error("Failed to process image: " + err.message);
      setScanning(false);
    }
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
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
        const items = data.items.map((item: any) => ({ ...item, selected: true }));
        setResults(items);
        toast.success(`Found ${items.length} menu items!`);
      } else {
        toast.error("Could not parse menu items from image. Try a clearer photo.");
      }
    } catch (err: any) {
      console.error("AI scan error:", err);
      toast.error("AI scan failed: " + err.message);
    }
    setScanning(false);
  };

  const toggleItem = (index: number) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r));
  };

  const removeItem = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    const selectedItems = results.filter(r => r.selected !== false);
    if (selectedItems.length === 0) {
      toast.error("No items selected to save");
      return;
    }
    setSaving(true);
    try {
      const inserts = selectedItems.map((r) => ({
        hotel_id: hotelId,
        name: r.name,
        price: r.price,
        category: r.category || "General",
        price_variants: r.price_variants && r.price_variants.length > 0
          ? JSON.parse(JSON.stringify(r.price_variants))
          : null,
      }));

      const { error } = await supabase.from("menu_items").insert(inserts);
      if (error) {
        console.error("Save error:", error);
        toast.error("Save failed: " + error.message);
      } else {
        toast.success(`${selectedItems.length} items added to menu!`);
        onComplete();
        setOpen(false);
        setResults([]);
        setPreview(null);
      }
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    }
    setSaving(false);
  };

  const selectedCount = results.filter(r => r.selected !== false).length;
  const groupedByCategory = results.reduce<Record<string, ScannedItem[]>>((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <>
      <Button variant="outline" size="sm" className={compact ? "h-8 text-xs gap-1" : "gap-1"} onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> {compact ? "AI Scan" : "AI Scanner"}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResults([]); setPreview(null); setScanning(false); } }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Menu Scanner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
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
              <div className="relative rounded-xl overflow-hidden shrink-0">
                <img src={preview} alt="Menu scan" className="w-full max-h-32 object-cover" />
                {scanning && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm mt-2 text-muted-foreground">Scanning with AI...</p>
                    </div>
                  </div>
                )}
                {!scanning && (
                  <button
                    onClick={() => { setPreview(null); setResults([]); fileRef.current?.click(); }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{results.length} items found · {selectedCount} selected</p>
                </div>
                <ScrollArea className="flex-1 max-h-[40vh] border rounded-lg">
                  <div className="p-2 space-y-3">
                    {Object.entries(groupedByCategory).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5 px-1">{category}</p>
                        <div className="space-y-1">
                          {items.map((r, idx) => {
                            const globalIdx = results.indexOf(r);
                            return (
                              <div
                                key={globalIdx}
                                className={`flex items-start justify-between text-sm p-2 rounded-lg transition-colors cursor-pointer ${
                                  r.selected !== false ? "bg-primary/5 border border-primary/20" : "bg-muted/20 opacity-50"
                                }`}
                                onClick={() => toggleItem(globalIdx)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                      r.selected !== false ? "border-primary bg-primary" : "border-muted-foreground/30"
                                    }`}>
                                      {r.selected !== false && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                    <span className="font-medium truncate">{r.name}</span>
                                  </div>
                                  {r.price_variants && r.price_variants.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1 ml-6">
                                      {r.price_variants.map((v, vi) => (
                                        <span key={vi} className="text-xs bg-muted rounded-full px-2 py-0.5">
                                          {v.label}: <span className="font-semibold text-primary">₹{v.price}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-primary ml-6">₹{r.price}</span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeItem(globalIdx); }}
                                  className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button onClick={saveAll} disabled={saving || selectedCount === 0} className="w-full gap-1.5 shrink-0">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add {selectedCount} Items to Menu
                </Button>
              </div>
            )}

            {preview && !scanning && results.length === 0 && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">No items detected. Try a clearer photo.</p>
                <Button variant="outline" className="w-full" onClick={() => { setPreview(null); fileRef.current?.click(); }}>
                  Try another image
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiMenuScanner;
