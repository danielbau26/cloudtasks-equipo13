-- Multi-user support for the "tasks" table.
-- Run this once in the Supabase SQL Editor for the project used by supabaseClient.js.

-- Existing rows have no owner (they were created before login existed), so they are removed.
delete from public.tasks;

alter table public.tasks
    add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

alter table public.tasks enable row level security;

create policy "select_own_tasks" on public.tasks
    for select using (auth.uid() = user_id);

create policy "insert_own_tasks" on public.tasks
    for insert with check (auth.uid() = user_id);

create policy "update_own_tasks" on public.tasks
    for update using (auth.uid() = user_id);

create policy "delete_own_tasks" on public.tasks
    for delete using (auth.uid() = user_id);
