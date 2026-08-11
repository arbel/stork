-- Schedule the weekly digest: Thursday 15:00 UTC (~evening Israel time; 18:00 IDT / 17:00 IST).
-- Calls the weekly-digest edge function via pg_net, authenticating with the x-cron-secret
-- header read from Supabase Vault (secret 'weekly_digest_cron_secret', set out-of-band — the
-- value is never committed to git).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'weekly-digest-thursday',
  '0 15 * * 4',
  $$
    select net.http_post(
      url := 'https://bsupliyhzlflpiizwhhm.supabase.co/functions/v1/weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_digest_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $$
);
