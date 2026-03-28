
-- Wholesale products managed by Creator Admin
CREATE TABLE public.wholesale_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  unit text NOT NULL DEFAULT 'kg',
  price numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  is_available boolean NOT NULL DEFAULT true,
  is_urgent boolean NOT NULL DEFAULT false,
  min_order_qty numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_products ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can browse the catalog
CREATE POLICY "Authenticated users can view wholesale products"
  ON public.wholesale_products FOR SELECT
  TO authenticated USING (true);

-- Only creator admin can manage products
CREATE POLICY "Creator admin can insert wholesale products"
  ON public.wholesale_products FOR INSERT
  TO authenticated
  WITH CHECK (lower(COALESCE(auth.jwt()->>'email','')) = 'speedobill7@gmail.com');

CREATE POLICY "Creator admin can update wholesale products"
  ON public.wholesale_products FOR UPDATE
  TO authenticated
  USING (lower(COALESCE(auth.jwt()->>'email','')) = 'speedobill7@gmail.com');

CREATE POLICY "Creator admin can delete wholesale products"
  ON public.wholesale_products FOR DELETE
  TO authenticated
  USING (lower(COALESCE(auth.jwt()->>'email','')) = 'speedobill7@gmail.com');

-- Wholesale inquiries (catalog + WhatsApp inquiry model)
CREATE TABLE public.wholesale_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id),
  hotel_name text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  total_estimate numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_inquiries ENABLE ROW LEVEL SECURITY;

-- Hotel owners can insert inquiries
CREATE POLICY "Owners can insert wholesale inquiries"
  ON public.wholesale_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Hotel owners can view their own inquiries
CREATE POLICY "Owners can view own wholesale inquiries"
  ON public.wholesale_inquiries FOR SELECT
  TO authenticated
  USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Creator admin can view all inquiries
CREATE POLICY "Creator admin can view all wholesale inquiries"
  ON public.wholesale_inquiries FOR SELECT
  TO authenticated
  USING (lower(COALESCE(auth.jwt()->>'email','')) = 'speedobill7@gmail.com');

-- Creator admin can update inquiry status
CREATE POLICY "Creator admin can update wholesale inquiries"
  ON public.wholesale_inquiries FOR UPDATE
  TO authenticated
  USING (lower(COALESCE(auth.jwt()->>'email','')) = 'speedobill7@gmail.com');
