CREATE POLICY "Owners can view hotel staff profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_user_hotel_id(auth.uid())
    AND (
      has_role(auth.uid(), 'owner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );