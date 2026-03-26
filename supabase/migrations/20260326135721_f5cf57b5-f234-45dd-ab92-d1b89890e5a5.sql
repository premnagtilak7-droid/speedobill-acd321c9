-- Allow owners to insert PIN config into platform_config
CREATE POLICY "Owners can insert platform config"
ON public.platform_config
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  AND config_key LIKE 'owner_pin_%'
);

-- Allow owners to update their own PIN
CREATE POLICY "Owners can update own pin"
ON public.platform_config
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  AND config_key = ('owner_pin_' || get_user_hotel_id(auth.uid())::text)
);