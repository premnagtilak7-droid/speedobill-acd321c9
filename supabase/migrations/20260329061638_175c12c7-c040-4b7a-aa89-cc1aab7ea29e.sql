
-- Fix: Sync profile.role from user_roles (source of truth) for all mismatched staff
UPDATE public.profiles p
SET role = ur.role::text
FROM public.user_roles ur
WHERE ur.user_id = p.user_id
  AND p.role IS DISTINCT FROM ur.role::text;

-- Fix: Set hotel_id for the orphaned chef profile
-- Find the hotel they belong to via the owner who created them
UPDATE public.profiles
SET hotel_id = '73b0521f-1bb4-4e7b-b405-ede8be80296d'
WHERE user_id = '3b44df30-6f72-4b3d-8606-43fc2ea6fc0d'
  AND hotel_id IS NULL;
