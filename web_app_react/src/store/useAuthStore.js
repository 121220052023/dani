import { create } from "zustand";
import { ensureProfile, fetchCurrentProfile, touchStaffPresence } from "../lib/commerce";
import { supabase } from "../lib/supabase";
import { isStaffRole } from "../lib/roles";

const useAuthStore = create((set, get) => ({
  user: null,
  role: "guest",
  profile: null,
  isLoading: true,
  isChecking: false,
  error: "",
  async checkSession() {
    if (get().isChecking) return;

    console.log("[checkSession] Starting session check");
    try {
      if (!supabase) {
        console.error("[checkSession] Supabase is not configured");
        set({
          user: null,
          role: "guest",
          profile: null,
          isLoading: false,
          error: "Supabase is not configured.",
        });
        return;
      }

      set({ isChecking: true, error: "" });
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("[checkSession] Session retrieved:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      });

      if (error) {
        console.error("[checkSession] Error getting session:", error);
        set({ isLoading: false, isChecking: false, error: error.message });
        return;
      }

      if (!session?.user) {
        console.log("[checkSession] No session found, setting user to guest");
        set({
          user: null,
          role: "guest",
          profile: null,
          isLoading: false,
          isChecking: false,
          error: "",
        });
        return;
      }

      // Only set loading if we actually have a session to verify
      set({ isLoading: true });

      // Try fetching existing profile first to avoid unnecessary writes
      let profile = await fetchCurrentProfile(session.user);

      // Repair a missing profile without granting elevated access by default.
      if (!profile) {
        const metadataRole = session.user.user_metadata?.role;
        const bootstrapRole = isStaffRole(metadataRole)
          ? metadataRole
          : "retail";
        profile = await ensureProfile(bootstrapRole, session.user);
      }

      const nextError = profile?.is_blocked
        ? "This account is blocked."
        : !isStaffRole(profile?.role)
          ? "This web dashboard is restricted to admin, sales, and marketing accounts."
          : "";

      if (profile && isStaffRole(profile.role) && !profile.is_blocked) {
        touchStaffPresence(true).catch(() => {});
      }

      set({
        user: {
          id: session.user.id,
          email: session.user.email,
          full_name:
            profile?.full_name ??
            session.user.user_metadata?.full_name ??
            "Staff user",
        },
        role: profile?.role ?? "guest",
        profile,
        isLoading: false,
        isChecking: false,
        error: nextError,
      });
    } catch (error) {
      set({
        user: null,
        role: "guest",
        profile: null,
        isLoading: false,
        isChecking: false,
        error: error?.message ?? "Failed to initialize the staff session.",
      });
      return false;
    }
  },
  async signIn(email, password) {
    if (!supabase) {
      set({ error: "Supabase is not configured." });
      return false;
    }

    set({ error: "", isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
    // No need to call checkSession manually as onAuthStateChange will trigger it
    return true;
  },
  async signOut() {
    // Optimistic UI update: instantly clear state
    set({
      user: null,
      role: "guest",
      profile: null,
      error: "",
      isLoading: false,
    });
    if (supabase) {
      await supabase.auth.signOut();
    }
  },
}));

if (supabase) {
  // Check session on initial load
  useAuthStore.getState().checkSession().catch(() => {});

  supabase.auth.onAuthStateChange((event) => {
    // Avoid re-running session check on sign out to prevent flashes/delays
    if (["SIGNED_IN", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)) {
      useAuthStore
        .getState()
        .checkSession()
        .catch(() => {});
    }
  });
}

export default useAuthStore;
