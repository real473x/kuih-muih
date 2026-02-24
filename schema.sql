-- Create Products Table
create table public.products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  image_url text,
  default_price numeric not null,
  is_active boolean default true
);

-- Create Inventory Batches (Morning Hand-off)
create table public.inventory_batches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references public.products(id) not null,
  quantity_made integer not null,
  unit_price numeric not null -- Price at time of making
);

-- Create Sales Logs (Afternoon Return or Real-time)
create table public.sales_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references public.products(id) not null,
  quantity_sold integer not null,
  logged_by text default 'Father' -- 'Father' or 'Mother'
);

-- Dummy Data for Products
insert into public.products (name, image_url, default_price) values
('Karipap', 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=300&h=200', 0.50),
('Seri Muka', 'https://images.unsplash.com/photo-1602341612227-1612891401ac?auto=format&fit=crop&q=80&w=300&h=200', 0.80),
('Donut', 'https://images.unsplash.com/photo-1551024601-5637ade99e22?auto=format&fit=crop&q=80&w=300&h=200', 0.60),
('Popia Basah', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=300&h=200', 0.70);


-- STORAGE SETUP (For Image Uploads)
-- Run this to enable image uploads for new menu items
insert into storage.buckets (id, name, public) 
values ('products', 'products', true)
on conflict (id) do nothing;

-- Allow public access to view images
create policy "Public Access" 
  on storage.objects for select 
  using ( bucket_id = 'products' );

-- Allow public uploads (for simplicity in this prototype)
create policy "Public Upload" 
  on storage.objects for insert 
  with check ( bucket_id = 'products' );
