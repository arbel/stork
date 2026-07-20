import { supabase } from "@/integrations/supabase/client";

// DEV ONLY: skip the email OTP code by signing in with a fixed password account.
// Callers must guard usage behind `import.meta.env.DEV` so this never runs in prod.
// Works for fresh/reused test emails; returns false for OTP-only accounts (or when
// email confirmations are enabled) so the caller can fall back to the normal code flow.
const DEV_BYPASS_PASSWORD = "stork-dev-bypass-123!";

export const devSkipOtp = async (email: string): Promise<boolean> => {
  // Self-guard: never run outside a dev build, regardless of caller. import.meta.env.DEV is a
  // compile-time constant (false in prod), so this branch is dead-code-eliminated in production.
  if (!import.meta.env.DEV) return false;

  const signIn = await supabase.auth.signInWithPassword({ email, password: DEV_BYPASS_PASSWORD });
  if (!signIn.error) return true;

  const signUp = await supabase.auth.signUp({ email, password: DEV_BYPASS_PASSWORD });
  if (signUp.error) {
    console.warn("[dev] OTP bypass unavailable for this email, falling back to code flow:", signUp.error.message);
    return false;
  }
  if (signUp.data.session) return true;

  // Email confirmations enabled → signUp didn't create a session; try signing in.
  const retry = await supabase.auth.signInWithPassword({ email, password: DEV_BYPASS_PASSWORD });
  return !retry.error;
};
