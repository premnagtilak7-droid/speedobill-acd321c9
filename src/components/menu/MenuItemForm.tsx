import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setPrice(String(editItem.price));
      setCategory(editItem.category);
    } else {
      setName(""); setPrice(""); setCategory(categories[0] || "General");
    }
  }, [editItem, categories]);

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from("menu_items").update({
          name: name.trim(), price: Number(price), category,
        }).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        if (currentCount >= menuLimit) { toast.error("Menu limit reached"); setSaving(false); return; }
        const { error } = await supabase.from("menu_items").insert({
          hotel_id: hotelId, name: name.trim(), price: Number(price), category,
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
          <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : editItem ? "Update" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemForm;
