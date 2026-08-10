// Public one-click unsubscribe endpoint linked from digest emails.
// Deploy with --no-verify-jwt so the link is clickable without auth. Flips the user's
// emailUpdates preference off by their opaque token and returns a friendly Hebrew page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://www.stork-app.com";

function page(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{margin:0;font-family:'Assistant','Heebo','Noto Sans Hebrew',system-ui,sans-serif;background:#e7eeec;
    display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;color:#243b38;}
  .card{background:#fff;border-radius:20px;box-shadow:0 24px 60px -24px rgba(20,60,54,.4);
    max-width:440px;width:100%;padding:36px 28px;text-align:center;}
  .bird{font-size:44px}
  h1{font-size:22px;margin:12px 0 8px;color:#238d80}
  p{color:#6d827e;font-size:15px;line-height:1.7;margin:0 0 20px}
  a.btn{display:inline-block;text-decoration:none;color:#fff;font-weight:800;font-size:16px;
    background:#C42A63;padding:13px 28px;border-radius:999px;}
</style></head>
<body><div class="card">
  <div class="bird">🕊️</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a class="btn" href="${APP_URL}">חזרה לסטורק</a>
</div></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return page("קישור לא תקין", "הקישור לביטול חסר או שגוי. אפשר לנהל עדכונים ישירות מדף ההגדרות באפליקציה.");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin.rpc("unsubscribe_email_updates", { p_token: token });
  if (error) {
    return page("אופס", "משהו השתבש בביטול. נסו שוב מאוחר יותר או שנו זאת בהגדרות האפליקציה.");
  }
  const name = typeof data === "string" && data ? data : null;
  return page(
    "ביטלנו את העדכונים ✔️",
    `${name ? name + ", " : ""}לא נשלח לכם יותר את סיכום השבוע. אפשר להפעיל שוב בכל רגע מדף ההגדרות. נשמח לראותכם ממשיכים לבחור שם ביחד 💛`,
  );
});
