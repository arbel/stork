// Builds the weekly digest email as inline-styled, email-client-safe HTML.
// Mirrors the app's brand: teal stork header, pink CTA, cute Hebrew, RTL.

export interface DigestPartner {
  id: string;
  first_name: string | null;
  email: string;
  unsub_token: string;
  email_enabled: boolean;
}

export interface DigestCouple {
  partnership_id: string;
  u1: DigestPartner;
  u2: DigestPartner;
  matches_count: number;
  new_matches: { name: string; meaning: string | null }[];
  sample_matches: { name: string; meaning: string | null }[];
  u1_likes: string[];
  u2_likes: string[];
}

const TEAL = "#238d80";
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nameOf = (p: DigestPartner) => p.first_name?.trim() || p.email.split("@")[0];

function chips(names: string[], bg: string, color: string): string {
  if (!names.length) {
    return `<p style="margin:0;color:#98a6a3;font-size:14px;">אין לייקים חדשים השבוע — עוד הכול לפניכם 😊</p>`;
  }
  return names
    .map(
      (n) =>
        `<span style="display:inline-block;background:${bg};color:${color};border-radius:999px;padding:5px 13px;font-size:14px;font-weight:600;margin:0 0 6px 6px;">${esc(n)}</span>`,
    )
    .join("");
}

function matchCards(matches: { name: string; meaning: string | null }[]): string {
  if (!matches.length) {
    return `<p style="margin:0;color:#6d827e;font-size:14px;text-align:center;">עדיין אין התאמות חדשות — אולי השבוע תמצאו את שם הזהב 💛</p>`;
  }
  return matches
    .map(
      (m) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr><td style="background:#ffffff;border:1px solid #e2efec;border-radius:12px;padding:10px 14px;">
          <span style="font-weight:800;font-size:17px;color:${TEAL};">${esc(m.name)} ✨</span>
          ${m.meaning ? `<br><span style="color:#6d827e;font-size:12.5px;">${esc(m.meaning)}</span>` : ""}
        </td></tr>
      </table>`,
    )
    .join("");
}

export function buildDigestEmail(opts: {
  recipient: DigestPartner;
  partner: DigestPartner;
  matchesCount: number;
  newMatches: { name: string; meaning: string | null }[];
  sampleMatches: { name: string; meaning: string | null }[];
  recipientLikes: string[];
  partnerLikes: string[];
  appUrl: string;
  unsubUrl: string;
}): { subject: string; html: string } {
  const r = nameOf(opts.recipient);
  const p = nameOf(opts.partner);

  // Lead with new matches when there are any; otherwise fall back to a sample of the
  // couple's existing shared names so the block is never empty.
  const hasNew = opts.newMatches.length > 0;
  const matchesToShow = hasNew ? opts.newMatches : opts.sampleMatches;
  const matchLine = hasNew
    ? `יש לכם <b>${opts.newMatches.length}</b> ${opts.newMatches.length === 1 ? "התאמה חדשה" : "התאמות חדשות"} מאז המייל הקודם!`
    : `סה״כ ${opts.matchesCount} ${opts.matchesCount === 1 ? "שם משותף" : "שמות משותפים"} עד עכשיו`;
  const matchSay = hasNew
    ? `אולי אחת מהן היא <b>זו</b>?`
    : (opts.sampleMatches.length ? `הנה כמה מהשמות שכבר שניכם אוהבים 💛` : "");

  const subject = hasNew
    ? `יש לכם ${opts.newMatches.length} התאמות חדשות בסטורק! 🎉`
    : `העדכון השבועי שלכם בסטורק 💌`;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e7eeec;font-family:'Assistant','Heebo','Noto Sans Hebrew',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7eeec;padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">
    <!-- header -->
    <tr><td style="background:linear-gradient(135deg,#37B6A6,#238d80);background-color:#37B6A6;padding:26px 24px;text-align:center;">
      <div style="display:inline-block;background:#ffffff;border-radius:14px;padding:6px;line-height:0;">
        <img src="https://www.stork-app.com/favicon-512.png" width="46" height="46" alt="סטורק" style="display:block;border-radius:10px;">
      </div>
      <div style="font-size:24px;font-weight:800;color:#ffffff;margin-top:8px;">סטורק</div>
      <div style="font-size:13px;color:#eafaf7;margin-top:4px;">העדכון השבועי שלכם 💌</div>
    </td></tr>
    <!-- body -->
    <tr><td style="padding:28px 30px 6px;" dir="rtl">
      <div style="font-size:22px;font-weight:800;color:#243b38;text-align:center;">${esc(r)} ו${esc(p)}, איזה שבוע היה לכם! 🎉</div>
      <p style="color:#6d827e;font-size:15px;line-height:1.6;text-align:center;margin:6px 0 22px;">בזמן שאתם מחליקים, אנחנו סופרים לבבות. הנה מה שחדש אצלכם 👇</p>

      <!-- matches -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1faf8;border:1px solid #e2efec;border-radius:16px;margin-bottom:24px;"><tr><td style="padding:18px 18px 14px;">
        <div style="text-align:center;font-size:18px;font-weight:800;color:${TEAL};margin-bottom:4px;">💞 ${matchLine}</div>
        ${matchSay ? `<p style="text-align:center;color:#6d827e;font-size:14px;margin:0 0 12px;">${matchSay}</p>` : ""}
        ${matchCards(matchesToShow)}
      </td></tr></table>

      <!-- recipient likes -->
      <div style="font-size:15px;font-weight:800;color:#C24A73;margin:0 0 10px;">💗 מה ש${esc(r)} אהב/ה השבוע</div>
      <div style="margin-bottom:18px;">${chips(opts.recipientLikes, "#fbe9f0", "#9c2f56")}</div>

      <!-- partner likes -->
      <div style="font-size:15px;font-weight:800;color:#2f6a86;margin:0 0 10px;">💙 מה ש${esc(p)} אהב/ה השבוע</div>
      <div style="margin-bottom:22px;">${chips(opts.partnerLikes, "#e7f2f8", "#2f6a86")}</div>

      <!-- CTA -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:6px 0 24px;">
        <a href="${esc(opts.appUrl)}" style="display:inline-block;text-decoration:none;color:#ffffff;font-weight:800;font-size:17px;background:#C42A63;padding:15px 34px;border-radius:999px;">בואו נמצא עוד שם מושלם ←</a>
      </td></tr></table>
    </td></tr>
    <!-- footer -->
    <tr><td style="border-top:1px solid #e2efec;background:#f1faf8;padding:20px 26px;text-align:center;">
      <p style="color:#98a6a3;font-size:12.5px;line-height:1.6;margin:0;">קיבלתם את המייל הזה כי אתם זוג פעיל בסטורק</p>
      <p style="color:#98a6a3;font-size:12.5px;line-height:1.6;margin:8px 0 0;">
        מעדיפים בלי העדכונים? <a href="${esc(opts.unsubUrl)}" style="color:${TEAL};font-weight:600;">לחצו כאן לביטול</a>
        · או שנו זאת ב<a href="${esc(opts.appUrl)}/settings" style="color:${TEAL};font-weight:600;">הגדרות</a>.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  return { subject, html };
}
