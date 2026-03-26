-- Staff salary tracking
CREATE TABLE public.staff_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  base_salary numeric NOT NULL DEFAULT 0,
  advance_paid numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  paid_on date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage salaries" ON public.staff_salaries
  FOR ALL TO authenticated
  USING (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Staff can view own salary" ON public.staff_salaries
  FOR SELECT TO authenticated
  USING (staff_user_id = auth.uid());

-- Staff shift scheduling
CREATE TABLE public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_type text NOT NULL DEFAULT 'morning',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage shifts" ON public.staff_shifts
  FOR ALL TO authenticated
  USING (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Staff can view own shifts" ON public.staff_shifts
  FOR SELECT TO authenticated
  USING (staff_user_id = auth.uid());

-- Staff leave management
CREATE TABLE public.staff_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  leave_date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'casual',
  reason text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage leaves" ON public.staff_leaves
  FOR ALL TO authenticated
  USING (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Staff can view own leaves" ON public.staff_leaves
  FOR SELECT TO authenticated
  USING (staff_user_id = auth.uid());

-- Customer feedback/ratings
CREATE TABLE public.customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel members can manage feedback" ON public.customer_feedback
  FOR ALL TO authenticated
  USING (hotel_id = get_user_hotel_id(auth.uid()))
  WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));

-- Add phone and email to profiles for staff contact info
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text DEFAULT '';

-- Add loyalty tier and tags to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_tier text DEFAULT 'bronze';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spend numeric DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_visits integer DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_visit_at timestamptz;