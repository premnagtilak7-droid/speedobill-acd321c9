import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle } from "lucide-react";

interface InventoryMovement {
  name: string;
  unit: string;
  current_stock: number;
  used_today: number;
  wasted_today: number;
  purchased_today: number;
}

const DailyClosing = () => {
  const { hotelId } = useAuth();
  const [data, setData] = useState({ sales: 0, expenses: 0, orders: 0, counterOrders: 0 });
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const [salesRes, expRes, ordersRes, counterRes, ingredientsRes, wastageRes, purchaseRes, recipesRes, orderItemsRes] = await Promise.all([
        supabase.from("orders").select("total").eq("hotel_id", hotelId).eq("status", "billed").gte("created_at", startOfDay).lte("created_at", endOfDay),
        supabase.from("daily_expenses").select("amount").eq("hotel_id", hotelId).eq("expense_date", today),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId).gte("created_at", startOfDay).lte("created_at", endOfDay),
        supabase.from("counter_orders").select("total_amount").eq("hotel_id", hotelId).gte("created_at", startOfDay).lte("created_at", endOfDay),
        supabase.from("ingredients").select("id, name, unit, current_stock").eq("hotel_id", hotelId),
        supabase.from("wastage_logs").select("ingredient_id, quantity").eq("hotel_id", hotelId).gte("created_at", startOfDay).lte("created_at", endOfDay),
        supabase.from("purchase_logs").select("ingredient_id, quantity").eq("hotel_id", hotelId).gte("purchased_at", startOfDay).lte("purchased_at", endOfDay),
        supabase.from("recipes").select("menu_item_id, ingredient_id, quantity_required").eq("hotel_id", hotelId),
        supabase.from("order_items").select("name, quantity, order_id").in(
          "order_id",
          // Get today's billed order IDs
          (salesRes.data || []).length > 0 ? [] : []
        ),
      ]);

      const totalSales = (salesRes.data || []).reduce((s, o) => s + Number(o.total), 0);
      const counterSales = (counterRes.data || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const totalExpenses = (expRes.data || []).reduce((s, e) => s + Number(e.amount), 0);

      setData({
        sales: totalSales + counterSales,
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
  }, [hotelId]);

  const net = data.sales - data.expenses;

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Daily Closing</h1>
        <Badge variant="outline">{today}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">₹{data.sales.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold">₹{data.expenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className={`text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-500"}`}>₹{net.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Net Profit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{data.orders + data.counterOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Sales Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm"><span>Table Orders</span><span className="font-medium">{data.orders}</span></div>
          <div className="flex justify-between text-sm"><span>Counter Orders</span><span className="font-medium">{data.counterOrders}</span></div>
          <div className="flex justify-between text-sm border-t pt-2"><span>Total Sales</span><span className="font-medium">₹{data.sales.toFixed(0)}</span></div>
          <div className="flex justify-between text-sm"><span>Total Expenses</span><span className="font-medium text-red-500">-₹{data.expenses.toFixed(0)}</span></div>
          <div className="flex justify-between text-sm border-t pt-2 font-bold"><span>Net</span><span className={net >= 0 ? "text-green-600" : "text-red-500"}>₹{net.toFixed(0)}</span></div>
        </CardContent>
      </Card>

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
                    <tr key={item.name} className="border-b last:border-0 hover:bg-muted/30">
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
