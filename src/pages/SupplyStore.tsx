import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, ShoppingCart, Plus, Minus, X, Send,
  Clock, Zap, Loader2, Store, MessageSquare, Truck
} from "lucide-react";

interface WholesaleProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  mrp: number;
  image_url: string;
  is_available: boolean;
  is_urgent: boolean;
  min_order_qty: number;
}

interface CartItem {
  product: WholesaleProduct;
  quantity: number;
}

const CUTOFF_HOUR = 23; // 11 PM

const SupplyStore = () => {
  const { hotelId, user } = useAuth();
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hotelName, setHotelName] = useState("");

  useEffect(() => {
    loadProducts();
    if (hotelId) {
      supabase.from("hotels").select("name").eq("id", hotelId).maybeSingle()
        .then(({ data }) => { if (data) setHotelName(data.name); });
    }
  }, [hotelId]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wholesale_products" as any)
      .select("*")
      .eq("is_available", true)
      .order("category")
      .order("name");
    setProducts((data || []) as unknown as WholesaleProduct[]);
    setLoading(false);
  };

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let items = products;
    if (activeCategory !== "All") items = items.filter(p => p.category === activeCategory);
    if (search) items = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [products, activeCategory, search]);

  const isPastCutoff = useMemo(() => new Date().getHours() >= CUTOFF_HOUR, []);

  const addToCart = (product: WholesaleProduct) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + product.min_order_qty } : c);
      return [...prev, { product, quantity: product.min_order_qty }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev.map(c => c.product.id === id ? { ...c, quantity: Math.max(c.product.min_order_qty, c.quantity + delta) } : c)
        .filter(c => c.quantity >= c.product.min_order_qty)
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.product.id !== id));

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const savings = cart.reduce((sum, c) => sum + (c.product.mrp - c.product.price) * c.quantity, 0);

  const sendWhatsAppInquiry = useCallback(async () => {
    if (!hotelId || cart.length === 0) return;
    setSubmitting(true);

    // Save inquiry to DB
    const { error } = await supabase.from("wholesale_inquiries" as any).insert({
      hotel_id: hotelId,
      hotel_name: hotelName,
      items: cart.map(c => ({ name: c.product.name, qty: c.quantity, unit: c.product.unit, price: c.product.price })),
      total_estimate: cartTotal,
      notes,
      status: "pending",
    } as any);

    if (error) {
      toast.error("Failed to save inquiry");
      setSubmitting(false);
      return;
    }

    // Build WhatsApp message
    const itemLines = cart.map(c => `• ${c.product.name} — ${c.quantity} ${c.product.unit} (₹${(c.product.price * c.quantity).toFixed(0)})`).join("\n");
    const msg = encodeURIComponent(
      `🛒 *Wholesale Order Inquiry*\n\n` +
      `🏨 Hotel: ${hotelName}\n` +
      `📋 Items:\n${itemLines}\n\n` +
      `💰 Total Estimate: ₹${cartTotal.toFixed(0)}\n` +
      (savings > 0 ? `🎁 You save: ₹${savings.toFixed(0)}\n` : "") +
      (notes ? `📝 Notes: ${notes}\n` : "") +
      `\n_Sent via Speedo Bill Supply Store_`
    );

    window.open(`https://wa.me/919890229484?text=${msg}`, "_blank");
    toast.success("Inquiry sent! We'll confirm your order shortly.");
    setCart([]);
    setNotes("");
    setCartOpen(false);
    setSubmitting(false);
  }, [hotelId, hotelName, cart, cartTotal, savings, notes]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Supply Store
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Wholesale prices on bulk kitchen essentials
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPastCutoff && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <Clock className="h-3 w-3" /> Orders closed after 11 PM
            </Badge>
          )}
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Savings banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/40 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
          <Truck className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Free delivery on orders above ₹2,000</p>
          <p className="text-xs text-muted-foreground">Order by 11 PM for next-day delivery</p>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-muted-foreground border border-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No products found. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(product => {
            const cartItem = cart.find(c => c.product.id === product.id);
            const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
            return (
              <motion.div
                key={product.id}
                layout
                className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-foreground">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{product.category} • Min {product.min_order_qty} {product.unit}</p>
                    </div>
                    {product.is_urgent && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 shrink-0 ml-1">
                        <Zap className="h-2.5 w-2.5 mr-0.5" />1hr
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-foreground">₹{product.price}</span>
                    {discount > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
                        <Badge className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 px-1.5 py-0">{discount}% off</Badge>
                      </>
                    )}
                    <span className="text-[10px] text-muted-foreground">/ {product.unit}</span>
                  </div>

                  {cartItem ? (
                    <div className="flex items-center justify-center gap-1 bg-primary/10 rounded-xl py-1">
                      <button onClick={() => updateQty(product.id, -product.min_order_qty)} className="p-1.5 rounded-lg hover:bg-primary/20 active:scale-90">
                        <Minus className="h-3.5 w-3.5 text-primary" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{cartItem.quantity}</span>
                      <button onClick={() => updateQty(product.id, product.min_order_qty)} className="p-1.5 rounded-lg hover:bg-primary/20 active:scale-90">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl text-xs gap-1"
                      onClick={() => addToCart(product)}
                      disabled={isPastCutoff}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-20 md:bottom-6 left-0 right-0 z-50 px-4">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-primary text-primary-foreground rounded-2xl px-5 py-4 shadow-2xl active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-bold">{cart.length} item{cart.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">₹{cartTotal.toFixed(0)}</span>
              <span className="text-sm">Inquire →</span>
            </div>
          </button>
        </motion.div>
      )}

      {/* Cart Sheet */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-background rounded-t-3xl shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-background px-5 pt-4 pb-3 border-b border-border">
                <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Your Inquiry</h2>
                  <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl hover:bg-secondary">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">₹{product.price}/{product.unit} × {quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">₹{(product.price * quantity).toFixed(0)}</p>
                      <button onClick={() => removeFromCart(product.id)} className="p-1 hover:bg-destructive/10 rounded-lg">
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-border pt-3 space-y-2">
                  <textarea
                    placeholder="Special instructions (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none h-20"
                  />
                </div>

                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{cartTotal.toFixed(0)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>You save</span>
                      <span className="font-medium">₹{savings.toFixed(0)}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={sendWhatsAppInquiry}
                  disabled={submitting || isPastCutoff}
                  className="w-full rounded-2xl h-14 text-base font-bold shadow-lg gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5" />
                      Send via WhatsApp
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Your inquiry will be sent to Mangal Multiproduct via WhatsApp
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplyStore;
