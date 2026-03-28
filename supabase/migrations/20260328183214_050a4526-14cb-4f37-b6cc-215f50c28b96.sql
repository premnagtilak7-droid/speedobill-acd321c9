CREATE POLICY "Anon can read hotel by table reference"
  ON public.hotels
  AS PERMISSIVE FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_tables rt WHERE rt.hotel_id = hotels.id
    )
  );