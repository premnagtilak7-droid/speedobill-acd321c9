-- 1. FIX: Remove overly permissive anon read on customer_orders
DROP POLICY IF EXISTS "Anon can read own customer order" ON public.customer_orders;

-- Anon should not bulk-read all orders; use server-side logic for customer order status
CREATE POLICY "Anon can read own table orders"
ON public.customer_orders
AS PERMISSIVE FOR SELECT TO anon
USING (false);

-- 2. FIX: Remove dangerous self-role-assignment policy on user_roles
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- Only owners can assign roles (staff management), or first-time users with no existing role
CREATE POLICY "Owners can assign roles"
ON public.user_roles
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  OR
  (user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  ))
);