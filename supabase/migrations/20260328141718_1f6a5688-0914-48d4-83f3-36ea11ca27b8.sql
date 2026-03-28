
-- Fix 1: Restrict platform_config SELECT to own hotel's keys only
DROP POLICY IF EXISTS "Anyone can read platform config" ON public.platform_config;

CREATE POLICY "Users can read own hotel config"
ON public.platform_config
FOR SELECT
TO authenticated
USING (
  config_key = ('owner_pin_' || (get_user_hotel_id(auth.uid()))::text)
  OR config_key NOT LIKE 'owner_pin_%'
);

-- Fix 2: Prevent self-escalation in user_roles
DROP POLICY IF EXISTS "Owners can assign roles" ON public.user_roles;

CREATE POLICY "Owners can assign roles to hotel staff"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (
    has_role(auth.uid(), 'owner'::app_role)
    AND user_id <> auth.uid()
  )
  OR
  (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid())
    AND role IN ('waiter'::app_role, 'chef'::app_role)
  )
);
