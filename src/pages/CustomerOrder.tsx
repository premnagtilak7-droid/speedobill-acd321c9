import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Search, X, Send, UtensilsCrossed,
  ChefHat, Loader2, Smile, CloudRain, Zap, Coffee, Bell, Droplets,
  User, Gift, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
  hotel_id: string;
  price_variants: any;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CustomerProfile {
  name: string;
  phone: string;
  total_visits: number;
  loyalty_points: number;
  loyalty_tier: string;
}

// Mood → category mapping
const MOOD_MAP: Record<string, { icon: any; label: string; emoji: string; categories: string[]; color: string }> = {
  happy: {
    icon: Smile,
    label: "Happy",
    emoji: "😄",
    categories: ["Desserts", "Dessert", "Ice Cream", "Sweets", "Beverages", "Drinks", "Shakes"],
    color: "from-yellow-400 to-orange-400",
  },
  tired: {
    icon: Coffee,
    label: "Tired",
    emoji: "😴",
    categories: ["Coffee", "Tea", "Beverages", "Drinks", "Snacks", "Energy", "Shakes", "Juice"],
    color: "from-purple-400 to-indigo-400",
  },
  rainy: {
    icon: CloudRain,
    label: "Rainy Day",
    emoji: "🌧️",
    categories: ["Snacks", "Starters", "Pakoda", "Pakodas", "Tea", "Coffee", "Soup", "Soups", "Hot Beverages"],
    color: "from-blue-400 to-cyan-400",
  },
  hungry: {
    icon: Zap,
    label: "Starving",
    emoji: "🔥",
    categories: ["Main Course", "Mains", "Biryani", "Rice", "Thali", "Combos", "Meals", "Non-Veg", "Chinese"],
    color: "from-red-400 to-orange-500",
  },
};

const CustomerOrder = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [serviceCallSending, setServiceCallSending] = useState<string | null>(null);

  useEffect(() => {
    if (!tableId) return;
    loadTableAndMenu();
  }, [tableId]);

  const loadTableAndMenu = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("qr-order", {
        body: { action: "get_table_menu", table_id: tableId },
      });

      if (error || !data?.table) {
        toast.error("Invalid table. Please scan a valid QR code.");
        setLoading(false);
        return;
      }

      setTable(data.table);
      setMenu(data.menu || []);
    } catch {
      toast.error("Failed to load menu.");
    }
    setLoading(false);
  };

  // ── Customer Loyalty Lookup ──
  const lookupCustomer = useCallback(async (phone: string) => {
    if (!table || phone.length < 10) {
      setCustomerProfile(null);
      setLoyaltyDiscount(0);
      return;
    }
    setLookingUp(true);
    try {
      const { data } = await supabase.functions.invoke("qr-order", {
        body: { action: "lookup_customer", hotel_id: table.hotel_id, phone },
      });

      if (data?.customer) {
        setCustomerProfile(data.customer as CustomerProfile);
        if (!customerName && data.customer.name) setCustomerName(data.customer.name);
        const visits = data.customer.total_visits || 0;
        if ((visits + 1) % 10 === 0 && visits > 0) {
          setLoyaltyDiscount(50);
          toast.success("🎉 Congratulations! Your 10th visit — 50% OFF this order!", { duration: 5000 });
        } else {
          setLoyaltyDiscount(0);
        }
      } else {
        setCustomerProfile(null);
        setLoyaltyDiscount(0);
      }
    } catch {
      setCustomerProfile(null);
      setLoyaltyDiscount(0);
    }
    setLookingUp(false);
  }, [table, customerName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerPhone.length >= 10) lookupCustomer(customerPhone);
    }, 600);
    return () => clearTimeout(timer);
  }, [customerPhone, lookupCustomer]);

  // ── Service Calls (Call Waiter / Request Water) ──
  const sendServiceCall = async (callType: string) => {
    if (!table) return;
    setServiceCallSending(callType);
    try {
      const { data, error } = await supabase.functions.invoke("qr-order", {
        body: {
          action: "service_call",
          table_id: table.id,
          hotel_id: table.hotel_id,
          table_number: table.table_number,
          call_type: callType,
        },
      });
      if (error || !data?.success) {
        toast.error("Failed to send request. Please try again.");
      } else {
        toast.success(
          callType === "water" ? "💧 Water request sent!" : "🔔 Waiter has been notified!",
          { duration: 3000 }
        );
      }
    } catch {
      toast.error("Failed to send request. Please try again.");
    }
    setServiceCallSending(null);
  };

  const categories = useMemo(() => {
    const cats = [...new Set(menu.map((m) => m.category))];
    return ["All", ...cats];
  }, [menu]);

  // ── Mood-based filtering ──
  const filteredMenu = useMemo(() => {
    let items = menu;
    if (activeCategory !== "All") items = items.filter((m) => m.category === activeCategory);
    if (search) items = items.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

    // If mood selected and no category/search filter, prioritize mood categories
    if (selectedMood && activeCategory === "All" && !search) {
      const moodCats = MOOD_MAP[selectedMood]?.categories || [];
      const lowerMoodCats = moodCats.map((c) => c.toLowerCase());
      const highlighted = items.filter((m) => lowerMoodCats.includes(m.category.toLowerCase()));
      const rest = items.filter((m) => !lowerMoodCats.includes(m.category.toLowerCase()));
      return [...highlighted, ...rest];
    }
    return items;
  }, [menu, activeCategory, search, selectedMood]);

  const moodHighlightedIds = useMemo(() => {
    if (!selectedMood) return new Set<string>();
    const moodCats = MOOD_MAP[selectedMood]?.categories || [];
    const lowerMoodCats = moodCats.map((c) => c.toLowerCase());
    return new Set(menu.filter((m) => lowerMoodCats.includes(m.category.toLowerCase())).map((m) => m.id));
  }, [selectedMood, menu]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0)
    );
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const discountAmount = loyaltyDiscount > 0 ? (cartSubtotal * loyaltyDiscount) / 100 : 0;
  const cartTotal = cartSubtotal - discountAmount;
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    if (!table || cart.length === 0) return;
    setSubmitting(true);

    const orderPayload = {
      hotel_id: table.hotel_id,
      table_id: table.id,
      table_number: table.table_number,
      items: cart.map((c) => ({ name: c.name, price: c.price, quantity: c.quantity })),
      total_amount: cartTotal,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      status: "incoming",
      payment_status: "pending",
    };

    const { error } = await supabase.from("customer_orders").insert(orderPayload);

    if (error) {
      console.error("Order error:", error);
      toast.error("Failed to place order. Please try again.");
      setSubmitting(false);
      return;
    }

    setOrderPlaced(true);
    setCart([]);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold">Invalid Table</h1>
          <p className="text-muted-foreground">This QR code is not valid. Please scan the QR code on your table.</p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <ChefHat className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">Order Placed! 🎉</h1>
          <p className="text-muted-foreground">Your order has been sent to the kitchen. Table #{table.table_number}</p>
          {loyaltyDiscount > 0 && (
            <p className="text-sm font-medium text-green-600">🎁 {loyaltyDiscount}% loyalty discount applied!</p>
          )}
          <p className="text-sm text-muted-foreground">A waiter will serve your food shortly.</p>
          <div className="flex gap-2 justify-center pt-2">
            <Button
              onClick={() => { setOrderPlaced(false); setCart([]); }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Order More Items
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-orange-100 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Table #{table.table_number}
            </h1>
            <p className="text-xs text-muted-foreground">Browse menu & place your order</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Service Buttons */}
            <button
              onClick={() => sendServiceCall("water")}
              disabled={serviceCallSending === "water"}
              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 active:scale-95 transition-transform disabled:opacity-50"
              title="Request Water"
            >
              {serviceCallSending === "water" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
            </button>
            <button
              onClick={() => sendServiceCall("service")}
              disabled={serviceCallSending === "service"}
              className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 active:scale-95 transition-transform disabled:opacity-50"
              title="Call Waiter"
            >
              {serviceCallSending === "service" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            </button>
            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-orange-500 text-white shadow-lg active:scale-95 transition-transform"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Mood Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How are you feeling?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Object.entries(MOOD_MAP).map(([key, mood]) => {
              const Icon = mood.icon;
              const isActive = selectedMood === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMood(isActive ? null : key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${mood.color} text-white shadow-md`
                      : "bg-white dark:bg-gray-800 text-muted-foreground border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span className="text-base">{mood.emoji}</span>
                  {mood.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-orange-200 dark:border-gray-600 rounded-xl"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); if (cat !== "All") setSelectedMood(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-white dark:bg-gray-800 text-muted-foreground border border-orange-200 dark:border-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No items found</p>
            </div>
          ) : (
            filteredMenu.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const isMoodHighlighted = moodHighlightedIds.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`flex items-center gap-3 p-3 rounded-2xl border shadow-sm transition-all ${
                    isMoodHighlighted
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800"
                      : "bg-white dark:bg-gray-800 border-orange-100 dark:border-gray-700"
                  }`}
                >
                  {isMoodHighlighted && (
                    <div className="absolute -top-1.5 -left-1 z-10">
                      <span className="text-xs">⭐</span>
                    </div>
                  )}
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                      <UtensilsCrossed className="h-6 w-6 text-orange-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-0.5">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {cartItem ? (
                      <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 rounded-xl px-1">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1.5 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 active:scale-90">
                          <Minus className="h-4 w-4 text-orange-600" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{cartItem.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1.5 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 active:scale-90">
                          <Plus className="h-4 w-4 text-orange-600" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 active:scale-95 transition-all"
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-orange-500 text-white rounded-2xl px-5 py-4 shadow-2xl active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-bold">{cartCount} item{cartCount > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">₹{cartTotal.toFixed(0)}</span>
              <span className="text-sm">View Cart →</span>
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
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 pt-4 pb-3 border-b border-orange-100 dark:border-gray-700">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Your Order</h2>
                  <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">₹{(item.price * item.quantity).toFixed(0)}</p>
                          <div className="flex items-center gap-0.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <button onClick={() => updateQty(item.id, -1)} className="p-1 active:scale-90">
                              <Minus className="h-3.5 w-3.5 text-orange-600" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="p-1 active:scale-90">
                              <Plus className="h-3.5 w-3.5 text-orange-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Customer Info + Loyalty Lookup */}
                    <div className="border-t border-orange-100 dark:border-gray-700 pt-4 space-y-3">
                      <Input
                        placeholder="Your name (optional)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="rounded-xl"
                      />
                      <div className="relative">
                        <Input
                          placeholder="Phone number (for loyalty rewards)"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="rounded-xl pr-10"
                          type="tel"
                        />
                        {lookingUp && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />
                        )}
                      </div>

                      {/* Loyalty Profile Card */}
                      {customerProfile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-3 border border-orange-200 dark:border-orange-800"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                              <User className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{customerProfile.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  <Star className="h-2.5 w-2.5 mr-0.5" />
                                  {customerProfile.loyalty_tier || "Bronze"}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {customerProfile.total_visits || 0} visits • {Math.floor(customerProfile.loyalty_points || 0)} pts
                                </span>
                              </div>
                            </div>
                            {loyaltyDiscount > 0 && (
                              <div className="text-center">
                                <Gift className="h-5 w-5 text-green-600 mx-auto" />
                                <p className="text-[10px] font-bold text-green-600">{loyaltyDiscount}% OFF</p>
                              </div>
                            )}
                          </div>
                          {loyaltyDiscount === 0 && (
                            <p className="text-[10px] text-muted-foreground mt-2 text-center">
                              {10 - (((customerProfile.total_visits || 0) + 1) % 10)} more visits until your next reward! 🎁
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-orange-100 dark:border-gray-700 pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{cartSubtotal.toFixed(0)}</span>
                      </div>
                      {loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>🎁 Loyalty Discount ({loyaltyDiscount}%)</span>
                          <span>-₹{discountAmount.toFixed(0)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-xl font-bold text-orange-600">₹{cartTotal.toFixed(0)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={placeOrder}
                      disabled={submitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 text-base font-bold shadow-lg"
                    >
                      {submitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Place Order
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerOrder;
