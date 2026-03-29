import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "waiter" | "chef" | "manager" | string;

interface AccessContext {
  role: AppRole | null;
  hotelId: string | null;
}

const resolveRole = (primaryRole: string | null | undefined, fallbackRole?: string | null): AppRole => {
  return (primaryRole ?? fallbackRole ?? "owner") as AppRole;
};

export async function ensureUserAccessContext(
  userId: string,
  _currentUser: any
): Promise<AccessContext> {
  const [profileResult, userRoleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, hotel_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (userRoleResult.error) throw userRoleResult.error;

  const profile = profileResult.data;
  let resolvedRole = userRoleResult.data?.role as AppRole | null;
  const metadataRole = _currentUser?.user_metadata?.role as string | undefined;

  if (!profile) {
    const bootstrapRole = resolveRole(resolvedRole, metadataRole);
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, role: bootstrapRole });

    if (insertError && insertError.code !== "23505") throw insertError;

    if (!resolvedRole) {
      const { error: userRoleInsertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: bootstrapRole });

      if (userRoleInsertError && userRoleInsertError.code !== "23505") throw userRoleInsertError;
      resolvedRole = bootstrapRole;
    }

    return { role: bootstrapRole, hotelId: null };
  }

  if (!resolvedRole) {
    const fallbackRole = resolveRole(profile.role, metadataRole);
    const { error: userRoleInsertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: fallbackRole });

    if (userRoleInsertError && userRoleInsertError.code !== "23505") throw userRoleInsertError;
    resolvedRole = fallbackRole;
  }

  return {
    role: resolveRole(resolvedRole, profile.role),
    hotelId: profile.hotel_id,
  };
}
