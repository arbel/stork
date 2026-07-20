// Canonical public URL of the app. Invite links MUST use this rather than
// `window.location.origin`, so a link generated while on a preview/vercel.app domain (or the
// apex, which redirects) still points recipients at the real, canonical site.
export const APP_BASE_URL = "https://www.stork-app.com";

export const buildInviteUrl = (inviteCode: string): string =>
  `${APP_BASE_URL}/join/${inviteCode}`;
