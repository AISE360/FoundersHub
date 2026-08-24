-- ============================================================
-- Supabase Cron: Run send-reminders every day at 9:00 AM IST
-- IST = UTC+5:30, so 9:00 AM IST = 3:30 AM UTC
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pg_cron and pg_net extensions (if not already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the Edge Function daily at 3:30 UTC (= 9:00 AM IST)
select cron.schedule(
  'daily-reminders',          -- job name (unique)
  '30 3 * * *',               -- cron: 3:30 AM UTC = 9:00 AM IST every day
  $$
  select net.http_post(
    url     := 'https://pjzwllwhdbezgbjnldnj.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.edge_function_anon_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify the schedule was created:
-- select * from cron.job;

-- To remove/update the schedule later:
-- select cron.unschedule('daily-reminders');
