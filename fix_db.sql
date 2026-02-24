-- 1. Enable RLS on existing tables (Fixes warnings)
alter table public.products enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.sales_logs enable row level security;

-- 2. Create flexible policies (Allows everyone to do everything for this prototype)
-- Products
create policy "Public Access Products" on public.products for all using (true);
-- Inventory
create policy "Public Access Inventory" on public.inventory_batches for all using (true);
-- Sales
create policy "Public Access Sales" on public.sales_logs for all using (true);


-- 3. Storage Setup (Safe to run even if bucket exists, it will just do nothing)
insert into storage.buckets (id, name, public) 
values ('products', 'products', true)
on conflict (id) do nothing;

-- 4. Storage Policies (Drop first to avoid "already exists" error if re-running)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Public Upload" on storage.objects;

create policy "Public Access" 
  on storage.objects for select 
  using ( bucket_id = 'products' );

create policy "Public Upload" 
  on storage.objects for insert 
  with check ( bucket_id = 'products' );
