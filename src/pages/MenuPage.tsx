import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Crown, Zap, UtensilsCrossed, X, Search as SearchIcon, LayoutGrid, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import BulkMenuUpload from "@/components/menu/BulkMenuUpload";
import AiMenuScanner from "@/components/menu/AiMenuScanner";
import MenuSearch from "@/components/menu/MenuSearch";
import MenuCategoryTabs from "@/components/menu/MenuCategoryTabs";
import DenseMenuCard from "@/components/menu/DenseMenuCard";
import DenseMenuGrid from "@/components/menu/DenseMenuGrid";
import MenuItemForm from "@/components/menu/MenuItemForm";
import MenuCartBar from "@/components/menu/MenuCartBar";
import MenuSelectionSheet from "@/components/menu/MenuSelectionSheet";
import { Card, CardContent } from "@/components/ui/card";
import { useGridDensity } from "@/hooks/useGridDensity";

interface PriceVariant {
  label: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  min_stock: number;
  current_stock: number;
  image_url?: string;
  price_variants?: PriceVariant[];
}

const DEFAULT_CATEGORIES = ["Starters", "Main Course", "Desserts", "Beverages", "Snacks"];
const MENU_TIER_LIMITS: Record<string, number> = { free: 20, basic: 40, premium: Infinity };

const MenuPage = () => {
  const { hotelId, role } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [tier, setTier] = useState("free");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showSelection, setShowSelection] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { density, setDensity } = useGridDensity();

  const allCategories = useMemo(() => [...DEFAULT_CATEGORIES, ...customCategories], [customCategories]);
  const fetchItems = useCallback(async () => {
    if (!hotelId) return;
    try {
      const [menuRes, hotelRes, catRes] = await Promise.all([
        supabase.from("menu_items").select("*").eq("hotel_id", hotelId).order("category"),
        supabase.from("hotels").select("subscription_tier").eq("id", hotelId).maybeSingle(),
        supabase.from("custom_categories").select("name").eq("hotel_id", hotelId).order("name"),
      ]);
      if (menuRes.error) {
        toast.error(`Menu load failed [${menuRes.error.code}]: ${menuRes.error.message}`);
      } else if (menuRes.data) {
        setItems(menuRes.data.map((d: any) => ({
          ...d,
          price_variants: Array.isArray(d.price_variants) ? d.price_variants : [],
        })) as MenuItem[]);
      }
      if (hotelRes.error) {
        toast.error(`Hotel info error [${hotelRes.error.code}]: ${hotelRes.error.message}`);
      } else if (hotelRes.data) {
        setTier(hotelRes.data.subscription_tier);
      }
      if (catRes.error) {
        toast.error(`Categories error [${catRes.error.code}]: ${catRes.error.message}`);
      } else if (catRes.data) {
        setCustomCategories(catRes.data.map((c: any) => c.name));
      }
    } catch (err: any) {
      toast.error(`Failed to fetch menu: ${err.message}`);
    }
  }, [hotelId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const menuLimit = MENU_TIER_LIMITS[tier] || 20;
  const isOwner = role === "owner" || role === "admin";

  const filtered = useMemo(() => {
    let result = items;
    if (filterCat !== "all") result = result.filter((i) => i.category === filterCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filterCat, searchQuery]);

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [items]);

  const uniqueCategories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);

  const increment = useCallback((id: string) => {
    setQuantities((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }, []);

  const removeFromSelection = useCallback((id: string) => {
    setQuantities((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const clearAll = useCallback(() => setQuantities({}), []);

  const selectedItems = useMemo(() => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = items.find((i) => i.id === id);
        return item ? { id, name: item.name, price: item.price, quantity: qty } : null;
      })
      .filter(Boolean) as { id: string; name: string; price: number; quantity: number }[];
  }, [quantities, items]);

  const totalAmount = useMemo(() =>
    selectedItems.reduce((s, i) => s + i.price * i.quantity, 0), [selectedItems]
  );

  const handleAdd = () => {
    if (items.length >= menuLimit) { setShowUpgrade(true); return; }
    setEditItem(null);
    setShowForm(true);
  };

  const openEdit = useCallback((item: MenuItem) => {
    setEditItem(item);
    setShowForm(true);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) {
        toast.error(`Delete failed [${error.code}]: ${error.message}`);
        return;
      }
      toast.success("Item deleted");
      fetchItems();
    } catch (err: any) {
      toast.error(`Delete error: ${err.message}`);
    }
  }, [fetchItems]);

  const renderMenuCard = useCallback((item: MenuItem) => (
    <DenseMenuCard
      key={item.id}
      item={item}
      quantity={quantities[item.id] || 0}
      onClick={item.is_available ? () => increment(item.id) : undefined}
      onEdit={isOwner ? () => openEdit(item) : undefined}
      onDelete={isOwner ? () => { void deleteItem(item.id); } : undefined}
      showManagement={isOwner}
      dimmed={!item.is_available}
      size={density}
    />
  ), [deleteItem, density, increment, isOwner, openEdit, quantities]);

  const addCustomCategory = async () => {
    if (!hotelId || !newCategoryName.trim()) return;
    const trimmed = newCategoryName.trim();
    if (allCategories.includes(trimmed)) { toast.error("Category already exists"); return; }
    const { error } = await supabase.from("custom_categories").insert({ hotel_id: hotelId, name: trimmed } as any);
    if (error) { toast.error(error.message); return; }
    setCustomCategories((prev) => [...prev, trimmed]);
    setNewCategoryName("");
    toast.success("Category added");
  };

  const deleteCustomCategory = async (catName: string) => {
    if (!hotelId) return;
    await supabase.from("custom_categories").delete().eq("hotel_id", hotelId).eq("name", catName);
    setCustomCategories((prev) => prev.filter((c) => c !== catName));
    toast.success("Category removed");
  };

  const handleConfirmOrder = () => {
    toast.success(`✓ ${selectedItems.reduce((s, i) => s + i.quantity, 0)} items added to order`);
    clearAll();
    setShowSelection(false);
  };

  // Determine if we should show sidebar categories (tablet+)


  return (
    <div className="menu-page-root pb-36" style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      {/* MOBILE: sticky search + tabs */}
      <div className="sticky top-0 z-[100] border-b border-border bg-card/95 backdrop-blur md:hidden supports-[backdrop-filter]:bg-card/85" style={{ overflowX: "hidden" }}>
        <div className="space-y-2.5 px-3 py-3" style={{ maxWidth: "100%", overflowX: "hidden" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold font-display">Menu</h1>
              <p className="text-[11px] text-muted-foreground">{filtered.length} items · fast 4-column view</p>
            </div>
            {isOwner && (
              <Button onClick={handleAdd} size="sm" className="h-8 w-8 shrink-0 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {hotelId && isOwner && (
            <div className="grid grid-cols-2 gap-2">
              <AiMenuScanner compact hotelId={hotelId} existingCategories={customCategories} onComplete={fetchItems} />
              <BulkMenuUpload compact hotelId={hotelId} existingCategories={customCategories} onComplete={fetchItems} />
            </div>
          )}

          <MenuSearch query={searchQuery} onChange={setSearchQuery} />
          <MenuCategoryTabs
            categories={uniqueCategories}
            activeCategory={filterCat}
            onSelect={setFilterCat}
            itemCounts={itemCounts}
          />
        </div>
      </div>

      {/* TABLET + DESKTOP layout */}
      <div className="hidden md:block">
        {/* Header */}
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
          <div className="flex items-center justify-between gap-3 max-w-[1400px] mx-auto">
            <div>
              <h1 className="text-xl lg:text-2xl font-display font-bold">Menu</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Manage your menu items</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {menuLimit !== Infinity && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {items.length}/{menuLimit}
                </Badge>
              )}
              {hotelId && isOwner && (
                <>
                  <AiMenuScanner hotelId={hotelId} existingCategories={customCategories} onComplete={fetchItems} />
                  <BulkMenuUpload hotelId={hotelId} existingCategories={customCategories} onComplete={fetchItems} />
                </>
              )}
              {isOwner && (
                <Button onClick={() => setShowCategoryManager(true)} size="sm" variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" /> Category
                </Button>
              )}
              {isOwner && (
                <Button onClick={handleAdd} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar + Grid layout */}
        <div className="max-w-[1400px] mx-auto px-4 lg:px-5">
          <div className="grid gap-4 lg:gap-6" style={{ gridTemplateColumns: "clamp(160px, 15vw, 220px) 1fr" }}>
            {/* Category sidebar */}
            <aside className="sticky top-[56px] self-start max-h-[calc(100vh-72px)] overflow-y-auto pr-3 border-r border-border">
              <nav className="space-y-1 py-2">
                {["all", ...uniqueCategories].map((cat) => {
                  const isActive = filterCat === cat;
                  const count = cat === "all"
                    ? Object.values(itemCounts).reduce((a, b) => a + b, 0)
                    : (itemCounts[cat] || 0);
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCat(cat)}
                      className={`w-full flex items-center justify-between h-9 lg:h-10 px-3 rounded-lg text-[13px] lg:text-sm transition-all duration-150 ${
                        isActive
                          ? "bg-primary/15 text-primary font-medium border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground border-l-2 border-transparent"
                      }`}
                    >
                      <span className="truncate">{cat === "all" ? "All Items" : cat}</span>
                      <span className={`text-[11px] tabular-nums shrink-0 ml-2 px-1.5 py-0.5 rounded-md ${
                        isActive ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
              {isOwner && (
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="w-full mt-2 h-9 flex items-center gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Manage Categories
                </button>
              )}
            </aside>

            {/* Main content */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <MenuSearch query={searchQuery} onChange={setSearchQuery} />
                </div>
                {/* Grid size toggle */}
                <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
                  <button
                    onClick={() => setDensity("compact")}
                    className={`p-1.5 transition-colors ${density === "compact" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    title="Small grid"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDensity("visual")}
                    className={`p-1.5 transition-colors ${density === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    title="Large grid"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <Badge variant="outline" className="shrink-0 text-[11px] font-medium">
                  {filtered.length} items
                </Badge>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <SearchIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No items found for "{searchQuery}"</p>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No menu items yet. Add your first item!</p>
                      {isOwner && (
                        <Button onClick={handleAdd} className="mt-4 gap-1">
                          <Plus className="h-4 w-4" /> Add Item
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                filterCat === "all" ? (
                  // Group by category when showing all
                  uniqueCategories.filter(cat => filtered.some(i => i.category === cat)).map(cat => (
                    <div key={cat} className="mb-6">
                      <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                        <span className="h-1 w-4 rounded-full bg-primary" />
                        {cat}
                        <span className="text-[10px] text-muted-foreground font-normal">({filtered.filter(i => i.category === cat).length})</span>
                      </h2>
                      <DenseMenuGrid
                        items={filtered.filter(i => i.category === cat)}
                        renderItem={renderMenuCard}
                        className="gap-2.5 md:gap-3 lg:gap-3.5"
                        size={density}
                      />
                    </div>
                  ))
                ) : (
                  <DenseMenuGrid
                    items={filtered}
                    renderItem={renderMenuCard}
                    className="gap-2.5 md:gap-3 lg:gap-3.5"
                    size={density}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE items grid */}
      <div className="pb-2 pt-3 md:hidden" style={{ paddingLeft: "10px", paddingRight: "10px", overflowX: "hidden", maxWidth: "100%" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
            {searchQuery ? (
              <>
                <SearchIcon className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-[13px]">No items found for "{searchQuery}"</p>
              </>
            ) : (
              <>
                <UtensilsCrossed className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-[13px]">No items yet</p>
                {isOwner && (
                  <Button onClick={handleAdd} className="mt-4 h-9 w-full gap-1">
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          filterCat === "all" ? (
            uniqueCategories.filter(cat => filtered.some(i => i.category === cat)).map(cat => (
              <div key={cat} className="mb-4">
                <h2 className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="h-1 w-3 rounded-full bg-primary" />
                  {cat}
                  <span className="text-[9px] text-muted-foreground font-normal">({filtered.filter(i => i.category === cat).length})</span>
                </h2>
                <DenseMenuGrid
                  items={filtered.filter(i => i.category === cat)}
                  renderItem={renderMenuCard}
                  className="gap-2"
                  size={density}
                />
              </div>
            ))
          ) : (
            <DenseMenuGrid
              items={filtered}
              renderItem={renderMenuCard}
              className="gap-2"
              size={density}
            />
          )
        )}
      </div>

      {/* Cart Bar */}
      <MenuCartBar
        selectedItems={selectedItems}
        totalAmount={totalAmount}
        onViewSelection={() => setShowSelection(true)}
      />

      {/* Selection Sheet */}
      <MenuSelectionSheet
        open={showSelection}
        onOpenChange={setShowSelection}
        selectedItems={selectedItems}
        totalAmount={totalAmount}
        onRemoveItem={removeFromSelection}
        onClearAll={clearAll}
        onConfirm={handleConfirmOrder}
      />

      {/* Add/Edit Form */}
      {hotelId && (
        <MenuItemForm
          open={showForm}
          onOpenChange={(open) => { if (!open) { setEditItem(null); } setShowForm(open); }}
          editItem={editItem}
          hotelId={hotelId}
          categories={allCategories}
          onSaved={fetchItems}
          menuLimit={menuLimit}
          currentCount={items.length}
        />
      )}

      {/* Custom Category Manager */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Chinese, South Indian..."
                onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
              />
              <Button onClick={addCustomCategory} size="sm" className="shrink-0 gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Default Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_CATEGORIES.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
            {customCategories.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Custom Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {customCategories.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs gap-1 pr-1">
                      {c}
                      <button onClick={() => deleteCustomCategory(c)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Upgrade Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              You've reached the menu item limit ({menuLimit}) for your current plan.
            </p>
            <div className="space-y-3">
              <Card className="border-primary/30">
                <CardContent className="p-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <h4 className="font-display font-bold">Basic — ₹199/mo</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Up to 10 tables & 40 menu items</p>
                </CardContent>
              </Card>
              <Card className="border-primary animate-glow-pulse">
                <CardContent className="p-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-primary" />
                    <h4 className="font-display font-bold">Premium — ₹399/mo</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Unlimited tables & menu items + advanced analytics</p>
                </CardContent>
              </Card>
            </div>
            <Button className="w-full" onClick={() => { toast.info("Contact support to upgrade!"); setShowUpgrade(false); }}>
              Contact to Upgrade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuPage;
