const PROVIDER_LABELS = {
  google: { label: "Google", color: "#4285F4", bg: "#E8F0FE", icon: "G" },
  github: { label: "GitHub", color: "#fff", bg: "#24292E", icon: "GH" },
  email: { label: "Email", color: "#1565C0", bg: "#E3F2FD", icon: "@" },
};

export function getAuthProvider(user) {
  if (!user) return "email";

  const appProvider = user?.app_metadata?.provider;
  if (appProvider === "google" || appProvider === "github") return appProvider;

  const identities = user?.identities;
  if (identities && identities.length > 0) {
    const p = identities[0].provider;
    if (p === "google" || p === "github") return p;
  }

  return "email";
}

export function getProviderMeta(provider) {
  return PROVIDER_LABELS[provider] || PROVIDER_LABELS.email;
}

export function isOAuthProvider(provider) {
  return provider === "google" || provider === "github";
}

