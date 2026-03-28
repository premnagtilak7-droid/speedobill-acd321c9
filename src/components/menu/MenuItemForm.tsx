import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

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

const VARIANT_PRESETS = ["Half", "Full", "Quarter", "Piece", "Small", "Medium", "Large", "Regular"];

const MenuItemForm = ({ open, onOpenChange, editItem, hotelId, categories, onSaved, menuLimit, currentCount }: Props) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<PriceVariant[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setPrice(String(editItem.price));
      setCategory(editItem.category);
      setImagePreview(editItem.image_url || null);
      setVariants(editItem.price_variants?.length ? [...editItem.price_variants] : []);
    } else {
      setName(""); setPrice(""); setCategory(categories[0] || "General");
      setImagePreview(null); setVariants([]);
    }
    setImageFile(null);
  }, [editItem, categories]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagePreview;
    setUploading(true);
    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `${hotelId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, imageFile, { upsert: true });
    setUploading(false);
    if (error) { toast.error("Image upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { label: "", price: 0 }]);
  };

  const updateVariant = (index: number, field: "label" | "price", value: string) => {
    setVariants(prev => prev.map((v, i) =>
      i === index ? { ...v, [field]: field === "price" ? Number(value) || 0 : value } : v
    ));
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const addPresetVariants = () => {
    setVariants([{ label: "Half", price: 0 }, { label: "Full", price: 0 }]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const validVariants = variants.filter(v => v.label.trim() && v.price > 0);
    const basePrice = validVariants.length > 0 ? validVariants[0].price : Number(price);
    if (!basePrice || basePrice <= 0) { toast.error("Please enter a valid price"); return; }

    setSaving(true);
    try {
      const imageUrl = await uploadImage();

      if (editItem) {
        const updates: any = {
          name: name.trim(), price: basePrice, category,
          price_variants: (validVariants.length > 0 ? validVariants : []) as any,
        };
        if (imageUrl !== undefined) updates.image_url = imageUrl || "";
        const { error } = await supabase.from("menu_items").update(updates).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        if (currentCount >= menuLimit) { toast.error("Menu limit reached"); setSaving(false); return; }
        const { error } = await supabase.from("menu_items").insert([{
          hotel_id: hotelId, name: name.trim(), price: basePrice, category,
          image_url: imageUrl || "",
          price_variants: (validVariants.length > 0 ? validVariants : []) as any,
        }]);
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
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Image Upload */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            {imagePreview ? (
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

          <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Price Variants Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Price Variants</Label>
              <div className="flex gap-1">
                {variants.length === 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={addPresetVariants}>
                    + Half/Full
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={addVariant}>
                  <Plus className="h-3 w-3 mr-0.5" /> Custom
                </Button>
              </div>
            </div>

            {variants.length === 0 ? (
              <Input type="number" placeholder="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} />
            ) : (
              <div className="space-y-2 border rounded-lg p-2 bg-muted/20">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={v.label} onValueChange={(val) => updateVariant(i, "label", val)}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIANT_PRESETS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="₹ Price"
                      value={v.price || ""}
                      onChange={(e) => updateVariant(i, "price", e.target.value)}
                      className="h-8 text-xs w-24"
                    />
                    <button onClick={() => removeVariant(i)} className="h-6 w-6 shrink-0 rounded flex items-center justify-center hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full h-7 text-[10px]" onClick={addVariant}>
                  <Plus className="h-3 w-3 mr-1" /> Add Variant
                </Button>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving || uploading} className="w-full">
            {(saving || uploading) ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...</> : editItem ? "Update" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemForm;
