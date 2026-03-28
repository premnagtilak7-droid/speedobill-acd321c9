import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UtensilsCrossed, Plus, Trash2, Search, ChevronDown, ChevronRight, Package } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

interface Recipe {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_required: number;
}

const RecipesPage = () => {
  const { hotelId } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Add recipe form state
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!hotelId) return;
    setLoading(true);
    const [menuRes, ingRes, recRes] = await Promise.all([
      supabase.from("menu_items").select("id, name, category, price").eq("hotel_id", hotelId).order("category").order("name"),
      supabase.from("ingredients").select("id, name, unit, current_stock").eq("hotel_id", hotelId).order("name"),
      supabase.from("recipes").select("id, menu_item_id, ingredient_id, quantity_required").eq("hotel_id", hotelId),
    ]);
    setMenuItems(menuRes.data || []);
    setIngredients(ingRes.data || []);
    setRecipes(recRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [hotelId]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }, [menuItems, search]);

  const getRecipesForItem = (itemId: string) => recipes.filter(r => r.menu_item_id === itemId);
  const getIngredient = (id: string) => ingredients.find(i => i.id === id);

  const addRecipe = async (menuItemId: string) => {
    if (!selectedIngredient || !quantity || !hotelId) return;
    const existing = recipes.find(r => r.menu_item_id === menuItemId && r.ingredient_id === selectedIngredient);
    if (existing) { toast.error("Ingredient already added to this item"); return; }
    setSaving(true);
    const { error } = await supabase.from("recipes").insert({
      hotel_id: hotelId,
      menu_item_id: menuItemId,
      ingredient_id: selectedIngredient,
      quantity_required: parseFloat(quantity) || 0,
    });
    if (error) toast.error("Failed: " + error.message);
    else { toast.success("Ingredient linked"); setSelectedIngredient(""); setQuantity(""); fetchAll(); }
    setSaving(false);
  };

  const updateQuantity = async (recipeId: string, newQty: number) => {
    const { error } = await supabase.from("recipes").update({ quantity_required: newQty }).eq("id", recipeId);
    if (error) toast.error("Update failed");
    else setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, quantity_required: newQty } : r));
  };

  const deleteRecipe = async (recipeId: string) => {
    const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
    if (error) toast.error("Delete failed");
    else { toast.success("Removed"); setRecipes(prev => prev.filter(r => r.id !== recipeId)); }
  };

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    filteredItems.forEach(item => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  }, [filteredItems]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6" /> Recipe Manager
        </h1>
        <Badge variant="outline">{recipes.length} recipes linked</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Link ingredients to each menu item with exact quantities. When an order is billed, stock is auto-deducted.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {ingredients.length === 0 && (
        <Card className="border-warning/50">
          <CardContent className="p-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-warning" />
            <span className="text-sm">No ingredients found. Add ingredients in the <strong>Inventory Hub</strong> first.</span>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{category}</h2>
          {items.map(item => {
            const itemRecipes = getRecipesForItem(item.id);
            const isExpanded = expandedItem === item.id;

            return (
              <Card key={item.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price}</p>
                    </div>
                  </div>
                  <Badge variant={itemRecipes.length > 0 ? "default" : "secondary"} className="text-xs">
                    {itemRecipes.length} ingredient{itemRecipes.length !== 1 ? "s" : ""}
                  </Badge>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t">
                    {/* Existing recipes */}
                    {itemRecipes.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {itemRecipes.map(recipe => {
                          const ing = getIngredient(recipe.ingredient_id);
                          if (!ing) return null;
                          return (
                            <div key={recipe.id} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg p-2">
                              <span className="flex-1 font-medium">{ing.name}</span>
                              <Input
                                type="number"
                                className="w-20 h-8 text-xs"
                                value={recipe.quantity_required}
                                onChange={e => updateQuantity(recipe.id, parseFloat(e.target.value) || 0)}
                              />
                              <span className="text-xs text-muted-foreground w-8">{ing.unit}</span>
                              <span className="text-xs text-muted-foreground">
                                (Stock: {ing.current_stock})
                              </span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRecipe(recipe.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add ingredient form */}
                    {ingredients.length > 0 && (
                      <div className="flex items-end gap-2 mt-3 flex-wrap">
                        <div className="space-y-1 flex-1 min-w-[140px]">
                          <label className="text-xs text-muted-foreground">Ingredient</label>
                          <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients
                                .filter(ing => !itemRecipes.some(r => r.ingredient_id === ing.id))
                                .map(ing => (
                                  <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 w-24">
                          <label className="text-xs text-muted-foreground">Qty needed</label>
                          <Input
                            type="number"
                            className="h-9 text-xs"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            placeholder="e.g. 20"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-9"
                          disabled={saving || !selectedIngredient || !quantity}
                          onClick={() => addRecipe(item.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ))}

      {filteredItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No menu items found.</p>
      )}
    </div>
  );
};

export default RecipesPage;
