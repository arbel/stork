// Public one-click unsubscribe endpoint linked from digest emails.
// Deploy with --no-verify-jwt so the link is clickable without auth. Flips the user's
// emailUpdates preference off by their opaque token, then redirects to a confirmation page
// in the app. (Edge functions can't serve text/html — the platform downgrades it to
// text/plain — so we render the confirmation in the SPA instead.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://www.stork-app.com";

function redirect(status: string, name?: string | null): Response {
  const url = new URL(`${APP_URL}/unsubscribed`);
  url.searchParams.set("status", status);
  if (name) url.searchParams.set("name", name);
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return redirect("invalid");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin.rpc("unsubscribe_email_updates", { p_token: token });
  if (error) return redirect("error");
  const name = typeof data === "string" && data ? data : null;
  return redirect("ok", name);
});
