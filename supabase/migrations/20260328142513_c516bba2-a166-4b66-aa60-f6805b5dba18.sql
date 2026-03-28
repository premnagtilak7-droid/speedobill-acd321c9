
-- Fix: Remove self-assignment path entirely. Only owners/managers can assign roles via edge function.
-- New users get their role from the handle_new_user trigger (which uses service role, bypassing RLS).

DROP POLICY IF EXISTS "Owners can assign roles to hotel staff" ON public.user_roles;

CREATE POLICY "Owners can assign roles to hotel staff"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  AND user_id <> auth.uid()
);
