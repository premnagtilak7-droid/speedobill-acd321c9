import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Camera, Loader2, Check, X, Trash2, Edit2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PriceVariant { label: string; price: number; }
interface ScannedItem {
  name: string;
  price: number;
  category: string;
  price_variants?: PriceVariant[] | null;
  selected: boolean;
}
interface Props {
  compact?: boolean;
  hotelId: string;
  existingCategories: string[];
  onComplete: () => void;
}

const AiMenuScanner = ({ compact, hotelId, onComplete }: Props) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanStatus, setScanStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxDim = 1200, quality = 0.7): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round((maxDim / w) * h); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round((maxDim / h) * w); h = maxDim; } }
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    try {
      setScanning(true);
      setScanStatus("processing");
      setItems([]);
      const compressed = await compressImage(file);
      setPreview(compressed);
      await scanImage(compressed);
    } catch (err: any) {
      toast.error("Failed to process image: " + err.message);
      setScanStatus("error");
      setScanning(false);
    }
  };

  const scanImage = async (base64: string) => {
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

      if (data.items?.length > 0) {
        const mapped: ScannedItem[] = data.items.map((item: any) => ({
          name: String(item.name || "").trim(),
          price: Number(item.price) || 0,
          category: String(item.category || "General").trim(),
          price_variants: Array.isArray(item.price_variants) && item.price_variants.length > 0
            ? item.price_variants.map((v: any) => ({ label: String(v.label), price: Number(v.price) }))
            : null,
          selected: true,
        }));
        setItems(mapped);
        setScanStatus("success");
        toast.success(`Extraction Successful — ${mapped.length} items found!`);
      } else {
        setScanStatus("error");
        toast.error("Could not extract menu items. Try a clearer photo.");
      }
    } catch (err: any) {
      console.error("AI scan error:", err);
      setScanStatus("error");
      toast.error("Upload Failed: " + err.message);
    }
    setScanning(false);
  };

  const updateItem = (index: number, field: keyof ScannedItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const updateVariantPrice = (itemIdx: number, variantIdx: number, price: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx || !item.price_variants) return item;
      const newVariants = [...item.price_variants];
      newVariants[variantIdx] = { ...newVariants[variantIdx], price };
      return { ...item, price_variants: newVariants };
    }));
  };

  const toggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const selectAll = () => setItems(prev => prev.map(i => ({ ...i, selected: true })));
  const deselectAll = () => setItems(prev => prev.map(i => ({ ...i, selected: false })));

  const saveAll = async () => {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) { toast.error("No items selected"); return; }

    setSaving(true);
    try {
      const inserts = selected.map(item => ({
        hotel_id: hotelId,
        name: item.name,
        price: item.price,
        category: item.category || "General",
        price_variants: item.price_variants && item.price_variants.length > 0
          ? JSON.parse(JSON.stringify(item.price_variants))
          : null,
      }));

      const { error } = await supabase.from("menu_items").insert(inserts);
      if (error) throw error;

      toast.success(`${selected.length} items added to menu!`);
      onComplete();
      setOpen(false);
      setItems([]);
      setPreview(null);
      setScanStatus("idle");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    }
    setSaving(false);
  };

  const selectedCount = items.filter(i => i.selected).length;

  const groupedByCategory = items.reduce<Record<string, { item: ScannedItem; globalIdx: number }[]>>((acc, item, idx) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ item, globalIdx: idx });
    return acc;
  }, {});

  const resetScanner = () => {
    setItems([]);
    setPreview(null);
    setScanStatus("idle");
    setScanning(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" className={compact ? "h-8 text-xs gap-1" : "gap-1"} onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> {compact ? "AI Scan" : "AI Scanner"}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetScanner(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Menu Scanner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

            {/* Upload Area */}
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
                <img src={preview} alt="Menu" className="w-full max-h-28 object-cover" />
                {scanning && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm mt-2 font-medium">Processing with AI...</p>
                    </div>
                  </div>
                )}
                {!scanning && (
                  <button onClick={() => { resetScanner(); fileRef.current?.click(); }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Status Badge */}
            {scanStatus === "error" && !scanning && (
              <div className="text-center space-y-2">
                <p className="text-sm text-destructive font-medium">❌ Upload Failed — No items detected</p>
                <Button variant="outline" size="sm" onClick={() => { resetScanner(); fileRef.current?.click(); }}>
                  Try another image
                </Button>
              </div>
            )}

            {/* Results: Editable Review List */}
            {items.length > 0 && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{items.length} items · {selectedCount} selected</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>All</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={deselectAll}>None</Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 max-h-[45vh] border rounded-lg">
                  <div className="p-2 space-y-4">
                    {Object.entries(groupedByCategory).map(([category, entries]) => (
                      <div key={category}>
                        <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 px-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {category} ({entries.length})
                        </p>
                        <div className="space-y-1.5">
                          {entries.map(({ item, globalIdx }) => (
                            <div
                              key={globalIdx}
                              className={`p-2 rounded-lg border transition-all ${
                                item.selected
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-muted/30 border-transparent opacity-50"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleItem(globalIdx)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 ${
                                    item.selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                                  }`}
                                >
                                  {item.selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </button>

                                {/* Editable Fields */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => updateItem(globalIdx, "name", e.target.value)}
                                    className="h-7 text-sm font-medium px-2"
                                    placeholder="Item name"
                                  />
                                  {item.price_variants && item.price_variants.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.price_variants.map((v, vi) => (
                                        <div key={vi} className="flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                                          <span>{v.label}:</span>
                                          <span className="text-primary font-semibold">₹</span>
                                          <Input
                                            type="number"
                                            value={v.price}
                                            onChange={(e) => updateVariantPrice(globalIdx, vi, Number(e.target.value))}
                                            className="h-5 w-14 text-xs px-1 border-0 bg-transparent font-semibold text-primary"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">₹</span>
                                      <Input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateItem(globalIdx, "price", Number(e.target.value))}
                                        className="h-7 w-20 text-sm font-semibold text-primary px-2"
                                        placeholder="Price"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Delete */}
                                <button
                                  onClick={() => removeItem(globalIdx)}
                                  className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button onClick={saveAll} disabled={saving || selectedCount === 0} className="w-full gap-1.5 shrink-0">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirm & Add {selectedCount} Items to Menu
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
