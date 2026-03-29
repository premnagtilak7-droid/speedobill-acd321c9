CREATE POLICY "Chefs can toggle menu availability"
  ON public.menu_items
  FOR UPDATE
  TO authenticated
  USING (
    hotel_id = get_user_hotel_id(auth.uid())
    AND has_role(auth.uid(), 'chef'::app_role)
  )
  WITH CHECK (
    hotel_id = get_user_hotel_id(auth.uid())
    AND has_role(auth.uid(), 'chef'::app_role)
  );