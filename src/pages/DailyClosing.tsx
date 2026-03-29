import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarCheck, TrendingUp, TrendingDown, Receipt, Package, AlertTriangle, Wallet, ShoppingCart } from "lucide-react";
import { format, parseISO } from "date-fns";

interface InventoryMovement {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  used_today: number;
  wasted_today: number;
  purchased_today: number;
}

interface ClosingStats {
  dineInSales: number;
  counterSales: number;
  totalSales: number;
  expenses: number;
  orders: number;
  counterOrders: number;
}

const getLocalDateRange = (date: string) => {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const DailyClosing = () => {
  const { hotelId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<ClosingStats>({
    dineInSales: 0,
    counterSales: 0,
    totalSales: 0,
    expenses: 0,
    orders: 0,
    counterOrders: 0,
  });
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      setLoading(true);
      const { startIso, endIso } = getLocalDateRange(selectedDate);

      const [salesRes, expRes, ordersRes, counterRes, ingredientsRes, wastageRes, purchaseRes] = await Promise.all([
        supabase.from("sales").select("amount").eq("hotel_id", hotelId).eq("sale_date", selectedDate),
        supabase.from("daily_expenses").select("amount, category").eq("hotel_id", hotelId).eq("expense_date", selectedDate),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId).gte("created_at", startIso).lte("created_at", endIso),
        supabase.from("counter_orders").select("id, total_amount").eq("hotel_id", hotelId).gte("created_at", startIso).lte("created_at", endIso),
        supabase.from("ingredients").select("id, name, unit, current_stock").eq("hotel_id", hotelId),
        supabase.from("wastage_logs").select("ingredient_id, quantity").eq("hotel_id", hotelId).gte("created_at", startIso).lte("created_at", endIso),
        supabase.from("purchase_logs").select("ingredient_id, quantity").eq("hotel_id", hotelId).gte("purchased_at", startIso).lte("purchased_at", endIso),
      ]);

      const dineInSales = (salesRes.data || []).reduce((s, sale) => s + Number(sale.amount), 0);
      const counterSales = (counterRes.data || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const totalExpenses = (expRes.data || []).reduce((s, e) => s + Number(e.amount), 0);

      setData({
        dineInSales,
        counterSales,
        totalSales: dineInSales + counterSales,
        expenses: totalExpenses,
        orders: ordersRes.count || 0,
        counterOrders: (counterRes.data || []).length,
      });

      // Build inventory movement from wastage and purchase logs
      const ings = ingredientsRes.data || [];
      const wastageMap: Record<string, number> = {};
      (wastageRes.data || []).forEach(w => {
        wastageMap[w.ingredient_id] = (wastageMap[w.ingredient_id] || 0) + Number(w.quantity);
      });
      const purchaseMap: Record<string, number> = {};
      (purchaseRes.data || []).forEach(p => {
        purchaseMap[p.ingredient_id] = (purchaseMap[p.ingredient_id] || 0) + Number(p.quantity);
      });

      // Estimate used today: we can approximate from recipes * order items
      // For now, show wastage + purchases as the movement data
      const movements: InventoryMovement[] = ings
        .map(ing => ({
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          current_stock: Number(ing.current_stock),
          used_today: 0, // Would need full order-item-recipe join; showing 0 for now
          wasted_today: wastageMap[ing.id] || 0,
          purchased_today: purchaseMap[ing.id] || 0,
        }))
        .filter(m => m.wasted_today > 0 || m.purchased_today > 0 || m.current_stock <= 5);

      setInventory(movements);
      setLoading(false);
    })();
  }, [hotelId, selectedDate]);

  const net = useMemo(() => data.totalSales - data.expenses, [data.totalSales, data.expenses]);
  const lowStockCount = useMemo(() => inventory.filter((item) => item.current_stock <= 5).length, [inventory]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6 text-primary" /> Daily Closing</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{format(new Date(selectedDate), "dd MMM yyyy")}</Badge>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">₹{data.totalSales.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">₹{data.expenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Receipt className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className={`text-2xl font-bold ${net >= 0 ? "text-primary" : "text-destructive"}`}>₹{net.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Net Profit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{data.orders + data.counterOrders}</p>
            <p className="text-xs text-muted-foreground">Orders Closed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>Dine-in sales</span><span className="font-medium">₹{data.dineInSales.toFixed(0)}</span></div>
            <div className="flex justify-between text-sm"><span>Counter sales</span><span className="font-medium">₹{data.counterSales.toFixed(0)}</span></div>
            <div className="flex justify-between text-sm"><span>Table orders</span><span className="font-medium">{data.orders}</span></div>
            <div className="flex justify-between text-sm"><span>Counter bills</span><span className="font-medium">{data.counterOrders}</span></div>
            <div className="flex justify-between text-sm border-t pt-2"><span>Total expenses</span><span className="font-medium text-destructive">-₹{data.expenses.toFixed(0)}</span></div>
            <div className="flex justify-between text-sm border-t pt-2 font-bold"><span>Net closing</span><span className={net >= 0 ? "text-primary" : "text-destructive"}>₹{net.toFixed(0)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Closing Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Selected day</span><span className="font-medium">{format(new Date(selectedDate), "EEE, dd MMM")}</span></div>
            <div className="flex justify-between"><span>Low stock items</span><span className="font-medium">{lowStockCount}</span></div>
            <div className="flex justify-between"><span>Inventory moves</span><span className="font-medium">{inventory.length}</span></div>
            <div className="rounded-xl bg-secondary/40 p-3 text-muted-foreground">
              This report now uses the selected local date and reads billed sales, expenses, stock purchases, and wastage for that exact day.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Inventory Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Daily Inventory Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Ingredient</th>
                    <th className="text-right p-3 font-medium">Purchased</th>
                    <th className="text-right p-3 font-medium">Wasted</th>
                    <th className="text-right p-3 font-medium">Closing Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({item.unit})</span>
                      </td>
                      <td className="p-3 text-right">
                        {item.purchased_today > 0 ? (
                          <span className="text-green-600">+{item.purchased_today}</span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {item.wasted_today > 0 ? (
                          <span className="text-destructive">-{item.wasted_today}</span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-right">
                         <span className={item.current_stock <= 5 ? "text-destructive font-bold" : ""}>
                          {item.current_stock}
                        </span>
                        {item.current_stock <= 5 && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-center text-muted-foreground text-sm">No inventory movement today</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyClosing;
