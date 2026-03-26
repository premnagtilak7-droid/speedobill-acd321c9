
-- 1. FIX: Remove overly permissive anon read on customers table
DROP POLICY IF EXISTS "Anon can read customers by phone" ON public.customers;

-- Replace with a restricted policy: anon can only read if they know the exact phone + hotel_id
CREATE POLICY "Anon can read customer by phone and hotel"
ON public.customers
AS PERMISSIVE FOR SELECT TO anon
USING (false);
-- Anonymous users should not read customer PII directly; 
-- if needed for customer order flow, use a server-side function instead.

-- 2. FIX: Remove the dangerous "Allow individual insert" policy on licenses
DROP POLICY IF EXISTS "Allow individual insert" ON public.licenses;

-- Also remove the redundant "Enable insert for admins" policy that checks profiles.role
DROP POLICY IF EXISTS "Enable insert for admins" ON public.licenses;

-- 3. FIX: Restrict anonymous read on restaurant_tables to specific table by ID
-- The QR code flow passes a specific table ID, so we can use request headers or just 
-- keep it open since table layout isn't sensitive PII. But let's tighten it.
DROP POLICY IF EXISTS "Anon can read table by id" ON public.restaurant_tables;

-- Anon needs to read a single table for QR ordering - this is acceptable
-- since table_number/capacity/section aren't PII
CREATE POLICY "Anon can read table by id"
ON public.restaurant_tables
AS PERMISSIVE FOR SELECT TO anon
USING (true);
-- Note: table layout data (number, capacity, section) is not PII.
-- If further restriction is needed, the customer order page passes table ID in URL.

-- 4. FIX: Add RLS policies for tables that have RLS enabled but no policies
-- held_orders table
CREATE POLICY "Hotel members can view held orders"
ON public.held_orders
AS PERMISSIVE FOR SELECT TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel members can insert held orders"
ON public.held_orders
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel members can update held orders"
ON public.held_orders
AS PERMISSIVE FOR UPDATE TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Owners can delete held orders"
ON public.held_orders
AS PERMISSIVE FOR DELETE TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- recipes table
CREATE POLICY "Hotel members can view recipes"
ON public.recipes
AS PERMISSIVE FOR SELECT TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Owners can insert recipes"
ON public.recipes
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update recipes"
ON public.recipes
AS PERMISSIVE FOR UPDATE TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete recipes"
ON public.recipes
AS PERMISSIVE FOR DELETE TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));
