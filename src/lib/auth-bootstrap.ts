import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "waiter" | "chef" | "admin" | string;

interface AccessContext {
  role: AppRole | null;
  hotelId: string | null;
}

export async function ensureUserAccessContext(
  userId: string,
  _currentUser: any
): Promise<AccessContext> {
  // 1. Get profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, hotel_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    // Create profile if it doesn't exist
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, role: "owner" });
    
    if (insertError && insertError.code !== "23505") throw insertError;

    // Also create user_role
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "owner" })
      .select()
      .maybeSingle();

    return { role: "owner", hotelId: null };
  }

  return {
    role: profile.role as AppRole,
    hotelId: profile.hotel_id,
  };
}
