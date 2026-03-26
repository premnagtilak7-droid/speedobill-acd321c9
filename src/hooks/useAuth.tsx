import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, createContext, useContext, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ensureUserAccessContext, type AppRole } from "@/lib/auth-bootstrap";
import { getScopedStorageKey, getScopedStoragePrefix } from "@/lib/backend-cache";
import { getSupabaseEnvErrorMessage } from "@/lib/supabase-env";

const checkOnline = (): boolean => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine;
  }
  return true;
};

const AUTH_CACHE_KEY = getScopedStorageKey("qb_auth_cache");
const SUBSCRIPTION_CACHE_PREFIX = getScopedStoragePrefix("qb_sub_cache");
const LEGACY_AUTH_CACHE_KEY = "qb_auth_cache";
const LEGACY_SUBSCRIPTION_CACHE_PREFIX = "qb_sub_cache";
const AUTH_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const AUTH_ERROR_TOAST_ID = "auth-account-load-error";

interface CachedAuthData {
  isLoggedIn: boolean;
  user: User | null;
  role: AppRole | null;
  hotelId: string | null;
  _ts: number;
}

function readAuthCache(): CachedAuthData | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedAuthData;
    if (Date.now() - (parsed._ts || 0) > AUTH_CACHE_MAX_AGE) return null;

    return {
      isLoggedIn: Boolean(parsed.isLoggedIn),
      user: parsed.user ?? null,
      role: parsed.role ?? null,
      hotelId: parsed.hotelId ?? null,
      _ts: parsed._ts ?? Date.now(),
    };
  } catch {
    return null;
  }
}

function writeAuthCache(user: User | null, role: AppRole | null, hotelId: string | null) {
  try {
    localStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({
        isLoggedIn: Boolean(user),
        user,
        role,
        hotelId,
        _ts: Date.now(),
      }),
    );
  } catch {}
}

function clearAuthCache() {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
      localStorage.removeItem(LEGACY_AUTH_CACHE_KEY);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(SUBSCRIPTION_CACHE_PREFIX) || key.startsWith(LEGACY_SUBSCRIPTION_CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: AppRole | null;
  hotelId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  hotelId: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const cached = readAuthCache();
  const [user, setUser] = useState<User | null>(cached?.isLoggedIn ? cached.user : null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(cached?.role ?? null);
  const [hotelId, setHotelId] = useState<string | null>(cached?.hotelId ?? null);

  const ensureProfileAndHotel = useCallback(async (userId: string, currentUser: User | null) => {
    try {
      return await ensureUserAccessContext(userId, currentUser);
    } catch (error: any) {
      console.error("Auth bootstrap error:", error);
      throw error;
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string, currentUser: User | null) => {
    setLoading(true);

    try {
      const { role: newRole, hotelId: newHotelId } = await ensureProfileAndHotel(userId, currentUser);

      setRole(newRole);
      setHotelId(newHotelId);
      writeAuthCache(currentUser, newRole, newHotelId);

      // Auth state loaded successfully
    } catch (error: any) {
      console.error("Error fetching user data:", error);

      if (error?.message === "Failed to fetch" || error?.message?.includes("Failed to fetch")) {
        toast.error("Network restricted. If on Wi-Fi, try switching to mobile data.", { id: AUTH_ERROR_TOAST_ID, duration: 8000 });
      } else if (error?.code === "PGRST116") {
        toast.error("Your account has duplicate backend records. Run the cleanup SQL once, then reload.", {
          id: AUTH_ERROR_TOAST_ID,
          duration: 9000,
        });
      } else {
        toast.error("We couldn’t finish loading your account. Please refresh and try again.", {
          id: AUTH_ERROR_TOAST_ID,
          duration: 8000,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [ensureProfileAndHotel]);

  useEffect(() => {
    let isMounted = true;

    const resetAuthState = () => {
      if (!isMounted) return;
      setUser(null);
      setRole(null);
      setHotelId(null);
      setLoading(false);
      clearAuthCache();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;

      if (!currentUser || event === "SIGNED_OUT") {
        resetAuthState();
        return;
      }

      setUser(currentUser);

      if (event === "TOKEN_REFRESHED") {
        return;
      }

      setTimeout(() => {
        if (isMounted) {
          void fetchUserData(currentUser.id, currentUser);
        }
      }, 0);
    });

    const initializeAuth = async () => {
      // Step 1: Validate env vars
      const envErrorMessage = getSupabaseEnvErrorMessage();

      if (envErrorMessage) {
        toast.error(envErrorMessage, { duration: 15000 });
        if (isMounted) setLoading(false);
        return;
      }

      if (!checkOnline()) {
        toast.error("No internet connection. Please check your network and restart the app.");
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          console.error("Session error:", sessionError);
          toast.error("Session expired. Please sign in again.", { duration: 8000 });
        }

        const currentUser = session?.user ?? null;

        if (!currentUser) {
          resetAuthState();
          return;
        }

        setUser(currentUser);
        await fetchUserData(currentUser.id, currentUser);
      } catch (error: any) {
        console.error("Auth initialization error:", error);
        toast.error("Something went wrong. Please refresh the page.", { duration: 8000 });
        if (isMounted) setLoading(false);
      }
    };

    void initializeAuth();

    const safetyTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [fetchUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setHotelId(null);
    setLoading(false);
    clearAuthCache();
  }, []);

  const value = useMemo(
    () => ({ user, loading, role, hotelId, signOut }),
    [user, loading, role, hotelId, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};