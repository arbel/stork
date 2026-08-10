// Weekly digest sender. Triggered by a scheduled cron (Thursday evening) with a shared
// secret header. Assembles each active couple's "what's new since last week" via the
// get_weekly_digest_data() RPC and emails both partners (who haven't opted out) via Resend.
//
// Auth: deploy with --no-verify-jwt and gate on the CRON_SECRET header instead, so only the
// scheduler can trigger it. Secrets required: CRON_SECRET, RESEND_API_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildDigestEmail, DigestCouple, DigestPartner } from "../_shared/digest-email.ts";

const APP_URL = "https://www.stork-app.com";
const FROM = "סטורק <noreply@stork-app.com>";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sendViaResend(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function unsubUrl(supabaseUrl: string, token: string) {
  return `${supabaseUrl}/functions/v1/email-unsubscribe?token=${encodeURIComponent(token)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ error: "RESEND_API_KEY not set" }, 500);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("get_weekly_digest_data");
  if (error) return json({ error: error.message }, 500);
  const couples = (data ?? []) as DigestCouple[];

  // Optional dry-run: POST {"test_email":"you@x.com"} sends only the first couple's digest
  // to that address instead of to real users, and does NOT advance the watermark.
  let testEmail: string | null = null;
  try {
    testEmail = (await req.json())?.test_email ?? null;
  } catch (_) { /* no body */ }

  let sent = 0;
  const failures: string[] = [];
  const sentPartnerships: string[] = [];

  const targets = testEmail ? couples.slice(0, 1) : couples;

  for (const c of targets) {
    let sentForThisCouple = false;
    const recipients: [DigestPartner, DigestPartner, string[], string[]][] = [
      [c.u1, c.u2, c.u1_likes, c.u2_likes],
      [c.u2, c.u1, c.u2_likes, c.u1_likes],
    ];
    for (const [recipient, partner, recipientLikes, partnerLikes] of recipients) {
      if (!testEmail && (!recipient.email_enabled || !recipient.email)) continue;
      const { subject, html } = buildDigestEmail({
        recipient, partner,
        matchesCount: c.matches_count,
        newMatches: c.new_matches,
        sampleMatches: c.sample_matches,
        recipientLikes, partnerLikes,
        appUrl: APP_URL,
        unsubUrl: unsubUrl(supabaseUrl, recipient.unsub_token),
      });
      try {
        await sendViaResend(resendKey, testEmail ?? recipient.email, subject, html);
        sent++;
        sentForThisCouple = true;
      } catch (e) {
        failures.push(`${recipient.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (testEmail) break; // one email is enough for a test
    }
    if (sentForThisCouple && !testEmail) sentPartnerships.push(c.partnership_id);
  }

  // Advance the per-couple watermark so next week only covers newer activity.
  if (sentPartnerships.length) {
    await admin.rpc("mark_digests_sent", { p_ids: sentPartnerships });
  }

  return json({ couples: targets.length, emails_sent: sent, failures, test: !!testEmail }, 200);
});
