import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const action: string = body.action;

    // ── 1. GET TABLE + MENU ──
    if (action === "get_table_menu") {
      const tableId: string = body.table_id;
      if (!tableId || typeof tableId !== "string" || tableId.length < 30) {
        return json({ error: "Invalid table_id" }, 400);
      }

      const { data: table, error: tableErr } = await admin
        .from("restaurant_tables")
        .select("id, table_number, hotel_id, status")
        .eq("id", tableId)
        .maybeSingle();

      if (tableErr || !table) return json({ error: "Table not found" }, 404);

      const { data: menu } = await admin
        .from("menu_items")
        .select("id, name, price, category, is_available, image_url, price_variants")
        .eq("hotel_id", table.hotel_id)
        .eq("is_available", true)
        .order("category")
        .order("name");

      // Fetch loyalty config
      const { data: loyaltyConfig } = await admin
        .from("hotel_loyalty_configs")
        .select("enabled, visit_goal, reward_type, reward_description, reward_value, min_bill_value")
        .eq("hotel_id", table.hotel_id)
        .maybeSingle();

      return json({
        table: { id: table.id, table_number: table.table_number, hotel_id: table.hotel_id, status: table.status },
        menu: menu || [],
        loyalty_config: loyaltyConfig || null,
      });
    }

    // ── 2. CUSTOMER LOOKUP ──
    if (action === "lookup_customer") {
      const { hotel_id, phone } = body;
      if (!hotel_id || !phone || typeof phone !== "string" || phone.length < 10) {
        return json({ error: "Invalid hotel_id or phone" }, 400);
      }

      const { data } = await admin
        .from("customers")
        .select("name, phone, total_visits, loyalty_points, loyalty_tier, visit_count, rewards_claimed")
        .eq("hotel_id", hotel_id)
        .eq("phone", phone)
        .maybeSingle();

      return json({ customer: data || null });
    }

    // ── 3. PLACE ORDER ──
    if (action === "place_order") {
      const { table_id, hotel_id, table_number, items, total_amount, customer_name, customer_phone } = body;

      if (!table_id || !hotel_id || !items || !Array.isArray(items) || items.length === 0) {
        return json({ error: "Missing required order fields" }, 400);
      }

      // Validate table belongs to hotel
      const { data: validTable } = await admin
        .from("restaurant_tables")
        .select("id")
        .eq("id", table_id)
        .eq("hotel_id", hotel_id)
        .maybeSingle();

      if (!validTable) return json({ error: "Invalid table/hotel combination" }, 400);

      // Validate items against actual menu
      const menuItemNames = items.map((i: any) => String(i.name));
      const { data: validMenu } = await admin
        .from("menu_items")
        .select("name")
        .eq("hotel_id", hotel_id)
        .eq("is_available", true)
        .in("name", menuItemNames);

      const validNames = new Set((validMenu || []).map((m: any) => m.name));
      const sanitizedItems = items
        .filter((i: any) => validNames.has(i.name))
        .map((i: any) => ({
          name: String(i.name).slice(0, 200),
          price: Math.max(0, Number(i.price) || 0),
          quantity: Math.min(100, Math.max(1, Math.round(Number(i.quantity) || 1))),
        }));

      if (sanitizedItems.length === 0) {
        return json({ error: "No valid menu items in order" }, 400);
      }

      const safeTotal = sanitizedItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

      const { error: orderErr } = await admin.from("customer_orders").insert({
        hotel_id,
        table_id,
        table_number: Number(table_number) || 0,
        items: sanitizedItems,
        total_amount: safeTotal,
        customer_name: customer_name ? String(customer_name).slice(0, 100) : null,
        customer_phone: customer_phone ? String(customer_phone).slice(0, 20) : null,
        status: "incoming",
        payment_status: "pending",
      });

      if (orderErr) return json({ error: "Failed to place order" }, 500);
      return json({ success: true });
    }

    // ── 4. SERVICE CALL ──
    if (action === "service_call") {
      const { table_id, hotel_id, table_number, call_type } = body;

      if (!table_id || !hotel_id || !call_type) {
        return json({ error: "Missing service call fields" }, 400);
      }

      const validTypes = ["service", "water"];
      if (!validTypes.includes(call_type)) {
        return json({ error: "Invalid call type" }, 400);
      }

      // Validate table belongs to hotel
      const { data: validTable } = await admin
        .from("restaurant_tables")
        .select("id")
        .eq("id", table_id)
        .eq("hotel_id", hotel_id)
        .maybeSingle();

      if (!validTable) return json({ error: "Invalid table" }, 400);

      const { error: scErr } = await admin.from("service_calls").insert({
        hotel_id,
        table_id,
        table_number: Number(table_number) || 0,
        call_type,
        status: "active",
      });

      if (scErr) return json({ error: "Failed to send request" }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("qr-order error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
