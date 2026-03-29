-- Add explicit waiter/chef assignment workflow for KDS tickets
ALTER TABLE public.kot_tickets
ADD COLUMN IF NOT EXISTS assigned_chef_id uuid,
ADD COLUMN IF NOT EXISTS assigned_waiter_id uuid,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_kot_tickets_assigned_chef_id ON public.kot_tickets(assigned_chef_id);
CREATE INDEX IF NOT EXISTS idx_kot_tickets_assigned_waiter_id ON public.kot_tickets(assigned_waiter_id);

-- Backfill waiter assignment from existing orders where possible
UPDATE public.kot_tickets kt
SET assigned_waiter_id = o.waiter_id
FROM public.orders o
WHERE o.id = kt.order_id
  AND kt.assigned_waiter_id IS NULL;

-- Ensure hotel members can update assignment/timer metadata on KOTs within their own hotel
DROP POLICY IF EXISTS "Hotel members can update KOT" ON public.kot_tickets;
CREATE POLICY "Hotel members can update KOT"
ON public.kot_tickets
FOR UPDATE
TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()))
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));