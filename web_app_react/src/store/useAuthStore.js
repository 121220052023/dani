import { create } from "zustand";
import { ensureProfile, fetchCurrentProfile, touchStaffPresence } from "../lib/api";
import { supabase } from "../lib/supabase";
import { isStaffRole } from "../lib/roles";

function _getProvider(user) {
  if (!user) return "email";
  const appProvider = user.app_metadata?.provider;
  if (appProvider === "google" || appProvider === "github") return appProvider;
  const identities = user.identities;
  if (identities && identities.length > 0) {
    const p = identities[0].provider;
    if (p === "google" || p === "github") return p;
  }
  return "email";
}

function _isOAuthProvider(provider) {
  return provider === "google" || provider === "github";
}

// Session timeout: 30 minutes (1800000 ms)
const SESSION_TIMEOUT = 30 * 60 * 1000;

const useAuthStore = create((set, get) => ({
  user: null,
  role: "guest",
  profile: null,
  isLoading: true,
  isChecking: false,
  error: "",
  _activityTimer: null,

  async checkSession() {
    if (get().isChecking) return;

    try {
      if (!supabase) {
        set({ user: null, role: "guest", profile: null, isLoading: false, error: "Supabase is not configured." });
        return;
      }

      set({ isChecking: true, error: "" });
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        set({ isLoading: false, isChecking: false, error: error.message });
        return;
      }

      if (!session?.user) {
        set({ user: null, role: "guest", profile: null, isLoading: false, isChecking: false, error: "" });
        return;
      }

      const provider = _getProvider(session.user);

      set({ isLoading: true });

      let profile = await fetchCurrentProfile(session.user);

      if (!profile) {
        const metadataRole = session.user.user_metadata?.role;
        const bootstrapRole = isStaffRole(metadataRole) ? metadataRole : "retail";
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
          full_name: profile?.full_name ?? session.user.user_metadata?.full_name ?? "Staff user",
          provider,
        },
        role: profile?.role ?? "guest",
        profile,
        isLoading: false,
        isChecking: false,
        error: nextError,
      });

      // Start activity timer after successful session check
      get().resetActivityTimer();
    } catch (error) {
      set({
        user: null, role: "guest", profile: null,
        isLoading: false, isChecking: false,
        error: error?.message ?? "Failed to initialize the staff session.",
      });
    }
  },

  resetActivityTimer() {
    const { _activityTimer } = get();
    if (_activityTimer) clearTimeout(_activityTimer);
    
    const timer = setTimeout(() => {
      get().signOut();
      window.location.href = "/login";
    }, SESSION_TIMEOUT);
    
    set({ _activityTimer: timer });
  },

  trackActivity() {
    // Only reset timer if user is logged in
    if (get().role !== "guest") {
      get().resetActivityTimer();
    }
  },

  async signInWithProvider(provider) {
    if (!supabase) {
      set({ error: "Supabase is not configured." });
      return false;
    }
    set({ error: "", isLoading: true });
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
    return true;
  },

  async signIn(email, password) {
    if (!supabase) {
      set({ error: "Supabase is not configured." });
      return false;
    }
    set({ error: "", isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
    return true;
  },

  async signOut() {
    const { _activityTimer } = get();
    if (_activityTimer) clearTimeout(_activityTimer);
    set({ user: null, role: "guest", profile: null, error: "", isLoading: false, _activityTimer: null });
    if (supabase) await supabase.auth.signOut();
  },
}));

if (supabase) {
  useAuthStore.getState().checkSession().catch(() => {});

  supabase.auth.onAuthStateChange((event) => {
    if (["SIGNED_IN", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)) {
      useAuthStore.getState().checkSession().catch(() => {});
    }
    if (event === "SIGNED_OUT") {
      useAuthStore.setState({ user: null, role: "guest", profile: null, error: "", isLoading: false });
    }
  });
}

export default useAuthStore;
