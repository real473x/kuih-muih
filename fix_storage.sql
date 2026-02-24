-- FIX STORAGE PERMISSIONS
-- This script explicitly grants access to the 'anon' role (public users)
-- and ensures the bucket exists.

-- 1. Create bucket if missing
insert into storage.buckets (id, name, public) 
values ('products', 'products', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Public Upload" on storage.objects;
drop policy if exists "Public Select" on storage.objects;
drop policy if exists "Public Insert" on storage.objects;

-- 3. Create explicit policies for public access (anon role)

-- Allow anyone to VIEW images in 'products' bucket
create policy "Public Select"
on storage.objects for select
to public
using ( bucket_id = 'products' );

-- Allow anyone to UPLOAD images to 'products' bucket
create policy "Public Insert"
on storage.objects for insert
to public
with check ( bucket_id = 'products' );

-- Ensure RLS is enabled on storage.objects (usually is, but good to check)
alter table storage.objects enable row level security;

-- Fix RLS on Data Tables (if not already done)
alter table public.products enable row level security;
drop policy if exists "Public Access Products" on public.products;
create policy "Public Access Products" on public.products for all using (true);

alter table public.inventory_batches enable row level security;
drop policy if exists "Public Access Inventory" on public.inventory_batches;
create policy "Public Access Inventory" on public.inventory_batches for all using (true);

alter table public.sales_logs enable row level security;
drop policy if exists "Public Access Sales" on public.sales_logs;
create policy "Public Access Sales" on public.sales_logs for all using (true);
