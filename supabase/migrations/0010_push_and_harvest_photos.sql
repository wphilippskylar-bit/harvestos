-- Phil: "integrate the phone stuff" (push notifications + camera photo-logging) into the PWA.
--
-- Two independent additions:
--
-- 1. push_subscriptions — one row per browser/device a user has enabled notifications on (a user
--    could have Harvest OS installed on both a phone and a laptop, each is its own subscription).
--    Stores the Web Push subscription object (endpoint + keys) the browser hands back from
--    `PushManager.subscribe()`. A user can only see/manage their own rows; the actual *sending* of
--    pushes happens from a server-side cron route using the service_role key, which bypasses RLS
--    entirely (same pattern as everywhere else server-side logic needs to read across users).
--
-- 2. batches.photo_url — a single photo taken at harvest time (camera capture on the Harvest form),
--    stored in a new "harvest-photos" Storage bucket, org-scoped by folder (`{org_id}/...`) with
--    storage policies mirroring the same is_org_member / is_org_editor checks already used
--    everywhere else, so a photo from one farm's harvest is never visible to another farm.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_org_idx on push_subscriptions(org_id);
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists push_sub_select on push_subscriptions;
create policy push_sub_select on push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists push_sub_insert on push_subscriptions;
create policy push_sub_insert on push_subscriptions
  for insert with check (user_id = auth.uid() and is_org_member(org_id));

drop policy if exists push_sub_delete on push_subscriptions;
create policy push_sub_delete on push_subscriptions
  for delete using (user_id = auth.uid());

grant select, insert, delete on push_subscriptions to authenticated;

alter table batches add column if not exists photo_url text;

-- Storage bucket for harvest photos. Private (not public) — access goes through RLS-checked
-- storage policies below, same as every other table in this app.
insert into storage.buckets (id, name, public)
values ('harvest-photos', 'harvest-photos', false)
on conflict (id) do nothing;

-- Storage policies key off the first path segment being the org_id, e.g.
-- "harvest-photos/<org_id>/<batch_id>-<timestamp>.jpg" — the app enforces that layout when it
-- uploads, and these policies enforce that only org members can read/write within their own folder.
drop policy if exists harvest_photos_select on storage.objects;
create policy harvest_photos_select on storage.objects
  for select using (
    bucket_id = 'harvest-photos'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists harvest_photos_insert on storage.objects;
create policy harvest_photos_insert on storage.objects
  for insert with check (
    bucket_id = 'harvest-photos'
    and is_org_editor((storage.foldername(name))[1]::uuid)
  );

drop policy if exists harvest_photos_delete on storage.objects;
create policy harvest_photos_delete on storage.objects
  for delete using (
    bucket_id = 'harvest-photos'
    and is_org_editor((storage.foldername(name))[1]::uuid)
  );
