import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, Sparkles, Upload } from "lucide-react";

interface PriceVariant { label: string; price: number; }
interface MenuItem {
  id: string; name: string; category: string; price: number;
  is_available: boolean; min_stock: number; current_stock: number;
  image_url?: string; price_variants?: PriceVariant[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: MenuItem | null;
  hotelId: string;
  categories: string[];
  onSaved: () => void;
  menuLimit: number;
  currentCount: number;
}

const MenuItemForm = ({ open, onOpenChange, editItem, hotelId, categories, onSaved, menuLimit, currentCount }: Props) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiGeneratedBase64, setAiGeneratedBase64] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"upload" | "ai">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setPrice(String(editItem.price));
      setCategory(editItem.category);
      setImagePreview(editItem.image_url || null);
    } else {
      setName(""); setPrice(""); setCategory(categories[0] || "General");
      setImagePreview(null);
    }
    setImageFile(null);
    setAiPrompt("");
    setAiGeneratedBase64(null);
    setImageMode("upload");
  }, [editItem, categories]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAiGeneratedBase64(null);
  };

  const generateAiImage = async () => {
    const prompt = aiPrompt.trim() || name.trim();
    if (!prompt) { toast.error("Enter item name or image description"); return; }
    setGeneratingAi(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-menu-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Generation failed");
      if (data.image_base64) {
        setAiGeneratedBase64(data.image_base64);
        setImagePreview(data.image_base64);
        setImageFile(null);
        toast.success("AI image generated!");
      }
    } catch (err: any) {
      toast.error("AI generation failed: " + err.message);
    }
    setGeneratingAi(false);
  };

  const uploadImage = async (): Promise<string | null> => {
    // If AI generated, convert base64 to file and upload
    if (aiGeneratedBase64) {
      setUploading(true);
      try {
        const res = await fetch(aiGeneratedBase64);
        const blob = await res.blob();
        const path = `${hotelId}/${Date.now()}.png`;
        const { error } = await supabase.storage.from("menu-images").upload(path, blob, { upsert: true, contentType: "image/png" });
        if (error) { toast.error("Image upload failed: " + error.message); setUploading(false); return null; }
        const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
        setUploading(false);
        return data.publicUrl;
      } catch (err: any) {
        toast.error("Upload failed: " + err.message);
        setUploading(false);
        return null;
      }
    }

    if (!imageFile) return imagePreview; // keep existing
    setUploading(true);
    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `${hotelId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, imageFile, { upsert: true });
    setUploading(false);
    if (error) { toast.error("Image upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const imageUrl = await uploadImage();

      if (editItem) {
        const updates: any = { name: name.trim(), price: Number(price), category };
        if (imageUrl !== undefined) updates.image_url = imageUrl || "";
        const { error } = await supabase.from("menu_items").update(updates).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        if (currentCount >= menuLimit) { toast.error("Menu limit reached"); setSaving(false); return; }
        const { error } = await supabase.from("menu_items").insert({
          hotel_id: hotelId, name: name.trim(), price: Number(price), category,
          image_url: imageUrl || "",
        });
        if (error) throw error;
        toast.success("Item added");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Image Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setImageMode("upload")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                imageMode === "upload" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Custom Upload
            </button>
            <button
              type="button"
              onClick={() => setImageMode("ai")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                imageMode === "ai" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Generate
            </button>
          </div>

          {/* Image Section */}
          {imageMode === "upload" ? (
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {imagePreview && !aiGeneratedBase64 ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 transition-colors"
                >
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add photo (optional)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {imagePreview && aiGeneratedBase64 ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                  <img src={imagePreview} alt="AI Generated" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setAiGeneratedBase64(null); setImagePreview(null); }}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-1.5">
                  <Sparkles className="h-6 w-6 text-primary/50" />
                  <span className="text-xs text-muted-foreground">AI will generate image</span>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Describe dish (or leave blank to use item name)"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={generateAiImage}
                  disabled={generatingAi}
                  className="shrink-0 gap-1"
                >
                  {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generatingAi ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          )}

          <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" placeholder="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving || uploading || generatingAi} className="w-full">
            {(saving || uploading) ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...</> : editItem ? "Update" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemForm;
