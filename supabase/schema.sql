create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('new', 'confirmed', 'shipped', 'delivered', 'cancelled');
  end if;
end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_price numeric(10,2) check (compare_price is null or compare_price >= price),
  stock int not null default 0 check (stock >= 0),
  sku text,
  brand text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  is_primary boolean not null default false
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  price_adjustment numeric(10,2) not null default 0,
  stock int not null default 0 check (stock >= 0),
  sku text,
  is_active boolean not null default true
);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  min_order numeric(10,2) not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  whatsapp text,
  address text not null,
  city text not null,
  province text not null,
  postal_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id),
  status order_status not null default 'new',
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  coupon_code text,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'LOGADGET.PK',
  tagline text default 'Gadgets that keep up with you',
  currency text not null default 'PKR',
  phone text default '+92 300 0000000',
  whatsapp text default '+92 300 0000000',
  email text default 'hello@logadget.pk',
  address text default 'Karachi, Pakistan',
  announcement text default 'Free delivery on orders above Rs 5,000 | Cash on Delivery all over Pakistan',
  shipping_fee numeric(10,2) not null default 250,
  free_shipping_above numeric(10,2) not null default 5000,
  allow_cod boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'manager')),
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_images_product on public.product_images(product_id, sort_order);
create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_customers_phone on public.customers(phone);

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists settings_updated_at on public.store_settings;
create trigger settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.can_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where id = auth.uid())
    or coalesce(
         (current_setting('request.headers', true)::json ->> 'x-admin-key') = 'subhan-daraz90'
         or (current_setting('request.headers', true)::json ->> 'X-Admin-Key') = 'subhan-daraz90',
         false
       );
$$;

revoke all on function public.can_admin() from public;
grant execute on function public.can_admin() to anon, authenticated;

create or replace function public.admin_ping()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_admin();
$$;

revoke all on function public.admin_ping() from public;
grant execute on function public.admin_ping() to anon, authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.discounts enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

do $$
begin
  execute 'grant select, insert, update, delete on storage.objects to anon';
exception when insufficient_privilege then
  null;
end $$;

drop policy if exists "public read categories" on public.categories;
drop policy if exists "admin manage categories" on public.categories;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "admin manage categories" on public.categories for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "public read products" on public.products;
drop policy if exists "admin manage products" on public.products;
create policy "public read products" on public.products for select to anon, authenticated using (true);
create policy "admin manage products" on public.products for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "public read product images" on public.product_images;
drop policy if exists "admin manage product images" on public.product_images;
create policy "public read product images" on public.product_images for select to anon, authenticated using (true);
create policy "admin manage product images" on public.product_images for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "public read product variants" on public.product_variants;
drop policy if exists "admin manage product variants" on public.product_variants;
create policy "public read product variants" on public.product_variants for select to anon, authenticated using (true);
create policy "admin manage product variants" on public.product_variants for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "admin manage discounts" on public.discounts;
create policy "admin manage discounts" on public.discounts for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "admin manage customers" on public.customers;
create policy "admin manage customers" on public.customers for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders" on public.orders for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "admin manage order items" on public.order_items;
create policy "admin manage order items" on public.order_items for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "public read settings" on public.store_settings;
drop policy if exists "admin manage settings" on public.store_settings;
create policy "public read settings" on public.store_settings for select to anon, authenticated using (true);
create policy "admin manage settings" on public.store_settings for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

drop policy if exists "admin read own profile" on public.admin_users;
drop policy if exists "admin manage admin users" on public.admin_users;
create policy "admin read own profile" on public.admin_users for select to authenticated using (id = auth.uid());
create policy "admin manage admin users" on public.admin_users for all to anon, authenticated
  using (public.can_admin()) with check (public.can_admin());

create or replace function public.get_coupon(p_code text)
returns table (code text, type text, value numeric, min_order numeric)
language sql
stable
security definer
set search_path = public
as $$
  select d.code, d.type, d.value, d.min_order
  from discounts d
  where upper(d.code) = upper(trim(p_code))
    and d.is_active
    and (d.starts_at is null or d.starts_at <= now())
    and (d.ends_at is null or d.ends_at >= now())
    and (d.usage_limit is null or d.used_count < d.usage_limit)
  limit 1;
$$;

revoke all on function public.get_coupon(text) from public;
grant execute on function public.get_coupon(text) to anon, authenticated;

create or replace function public.get_order(p_order_number text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'subtotal', o.subtotal,
    'discount_amount', o.discount_amount,
    'coupon_code', o.coupon_code,
    'shipping', o.shipping,
    'total', o.total,
    'payment_method', o.payment_method,
    'notes', o.notes,
    'created_at', o.created_at,
    'customer', jsonb_build_object(
      'full_name', c.full_name,
      'phone', c.phone,
      'city', c.city,
      'province', c.province,
      'address', c.address
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'variant_name', i.variant_name,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'line_total', i.line_total
      ) order by i.created_at)
      from order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o
  join customers c on c.id = o.customer_id
  where o.order_number = p_order_number
    and regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
$$;

revoke all on function public.get_order(text, text) from public;
grant execute on function public.get_order(text, text) to anon, authenticated;

create or replace function public.place_order(
  p_customer jsonb,
  p_items jsonb,
  p_coupon_code text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings store_settings%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_total numeric;
  v_coupon discounts%rowtype;
  v_lines jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_qty int;
  v_unit numeric;
  v_attempts int := 0;
  v_name text;
  v_phone text;
  v_whatsapp text;
  v_address text;
  v_city text;
  v_province text;
  v_postal text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  v_name := trim(coalesce(p_customer->>'full_name', ''));
  v_phone := trim(coalesce(p_customer->>'phone', ''));
  v_whatsapp := trim(coalesce(p_customer->>'whatsapp', ''));
  v_address := trim(coalesce(p_customer->>'address', ''));
  v_city := trim(coalesce(p_customer->>'city', ''));
  v_province := trim(coalesce(p_customer->>'province', ''));
  v_postal := trim(coalesce(p_customer->>'postal_code', ''));

  if v_name = '' then raise exception 'Customer name is required'; end if;
  if length(v_name) < 3 then raise exception 'Customer name is too short'; end if;
  if v_phone = '' then raise exception 'Phone number is required'; end if;
  if regexp_replace(v_phone, '\D', '', 'g') !~ '^[0-9]{10,12}$' then raise exception 'Enter a valid phone number'; end if;
  if v_address = '' then raise exception 'Delivery address is required'; end if;
  if v_city = '' then raise exception 'City is required'; end if;
  if v_province = '' then raise exception 'Province is required'; end if;

  select * into v_settings from store_settings where id = true;
  if not found then
    insert into store_settings (id) values (true) returning * into v_settings;
  end if;

  if not v_settings.allow_cod then
    raise exception 'Cash on Delivery is currently disabled';
  end if;

  select id into v_customer_id
  from customers
  where regexp_replace(phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
  order by created_at desc
  limit 1;

  if v_customer_id is null then
    insert into customers (full_name, phone, whatsapp, address, city, province, postal_code)
    values (v_name, v_phone, nullif(v_whatsapp, ''), v_address, v_city, v_province, nullif(v_postal, ''))
    returning id into v_customer_id;
  else
    update customers
    set full_name = v_name,
        phone = v_phone,
        whatsapp = nullif(v_whatsapp, ''),
        address = v_address,
        city = v_city,
        province = v_province,
        postal_code = nullif(v_postal, '')
    where id = v_customer_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 100 then
      raise exception 'Invalid quantity';
    end if;

    if nullif(v_item->>'product_id', '') is null then
      raise exception 'Invalid cart item';
    end if;

    select * into v_product
    from products
    where id = (v_item->>'product_id')::uuid and is_active
    for update;

    if not found then
      raise exception 'A product in your cart is no longer available';
    end if;

    v_unit := v_product.price;
    v_variant := null::product_variants;

    if nullif(v_item->>'variant_id', '') is not null then
      select * into v_variant
      from product_variants
      where id = (v_item->>'variant_id')::uuid
        and product_id = v_product.id
        and is_active
      for update;

      if not found then
        raise exception 'Selected option is no longer available for %', v_product.name;
      end if;

      if v_variant.stock < v_qty then
        raise exception 'Only % left for % (%)', v_variant.stock::text, v_product.name, v_variant.value;
      end if;

      v_unit := v_unit + v_variant.price_adjustment;
    end if;

    if v_product.stock < v_qty then
        raise exception 'Only % left in stock for %', v_product.stock::text, v_product.name;
      end if;

    update products set stock = stock - v_qty where id = v_product.id;

    if v_variant.id is not null then
      update product_variants set stock = stock - v_qty where id = v_variant.id;
    end if;

    v_subtotal := v_subtotal + (v_unit * v_qty);

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant.id,
      'product_name', v_product.name,
      'variant_name', case when v_variant.id is not null then v_variant.name || ': ' || v_variant.value else null end,
      'unit_price', v_unit,
      'quantity', v_qty,
      'line_total', v_unit * v_qty
    ));
  end loop;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select * into v_coupon
    from discounts
    where upper(code) = upper(trim(p_coupon_code))
      and is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (usage_limit is null or used_count < usage_limit)
    for update;

    if not found then
      raise exception 'Invalid or expired coupon code';
    end if;

    if v_subtotal < v_coupon.min_order then
      raise exception 'This coupon requires a minimum order of Rs %', v_coupon.min_order;
    end if;

    if v_coupon.type = 'percent' then
      v_discount := round(v_subtotal * v_coupon.value / 100, 2);
    else
      v_discount := least(v_coupon.value, v_subtotal);
    end if;

    update discounts set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_discount := least(v_discount, v_subtotal);
  v_shipping := 250;
  if v_coupon.id is not null and upper(v_coupon.code) = 'FREESHIPPING250' then
    v_discount := 0;
    v_shipping := 0;
  end if;
  v_total := v_subtotal - v_discount + v_shipping;

  loop
    v_order_number := 'LG-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into orders (order_number, customer_id, subtotal, discount_amount, coupon_code, shipping, total, payment_method, notes)
      values (v_order_number, v_customer_id, v_subtotal, v_discount, nullif(trim(coalesce(p_coupon_code, '')), ''), v_shipping, v_total, 'cod', nullif(trim(coalesce(p_notes, '')), ''))
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 10 then
        raise;
      end if;
    end;
  end loop;

  insert into order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, line_total)
  select
    v_order_id,
    (l->>'product_id')::uuid,
    nullif(l->>'variant_id', '')::uuid,
    l->>'product_name',
    nullif(l->>'variant_name', ''),
    (l->>'unit_price')::numeric,
    (l->>'quantity')::int,
    (l->>'line_total')::numeric
  from jsonb_array_elements(v_lines) l;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', v_shipping,
    'total', v_total,
    'created_at', now()
  );
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product bucket" on storage.objects;
drop policy if exists "admin upload product bucket" on storage.objects;
drop policy if exists "admin update product bucket" on storage.objects;
drop policy if exists "admin delete product bucket" on storage.objects;

create policy "public read product bucket" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

create policy "admin upload product bucket" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'product-images' and public.can_admin());

create policy "admin update product bucket" on storage.objects
  for update to anon, authenticated using (bucket_id = 'product-images' and public.can_admin())
  with check (bucket_id = 'product-images' and public.can_admin());

create policy "admin delete product bucket" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'product-images' and public.can_admin());

do $$
begin
  alter publication supabase_realtime add table public.store_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when insufficient_privilege then null;
end $$;

insert into public.categories (name, slug, description, sort_order) values
  ('Audio', 'audio', 'Earbuds, headphones and speakers', 1),
  ('Wearables', 'wearables', 'Smart watches and fitness bands', 2),
  ('Charging', 'charging', 'Chargers, cables and power banks', 3),
  ('Gaming', 'gaming', 'Gaming gear and accessories', 4)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, short_description, description, price, compare_price, stock, sku, brand, is_featured, tags)
select c.id, p.name, p.slug, p.short_description, p.description, p.price, p.compare_price, p.stock, p.sku, p.brand, p.is_featured, p.tags
from (values
  ('audio', 'LogaPods Pro Wireless Earbuds', 'logapods-pro', 'Active noise cancellation with 30-hour battery life', 'The LogaPods Pro deliver punchy bass, hybrid active noise cancellation and a 30 hour total playtime with the charging case. Bluetooth 5.3, IPX5 water resistance and low latency gaming mode.', 6499, 8999, 42, 'LG-AUD-001', 'Logadget', true, array['earbuds','anc','bluetooth']),
  ('audio', 'BoomX Mini Bluetooth Speaker', 'boomx-mini', 'Pocket speaker with deep bass and 12-hour playtime', 'A rugged portable speaker with IPX7 waterproofing, 12 hour playtime and dual pairing support.', 4299, 5499, 28, 'LG-AUD-002', 'Logadget', false, array['speaker','portable']),
  ('wearables', 'PulseFit Smart Watch S3', 'pulsefit-s3', '1.85 inch AMOLED display with SpO2 and heart rate tracking', 'Track workouts, sleep and heart rate with a bright AMOLED display, 100+ sports modes and 7 day battery life.', 7999, 11999, 35, 'LG-WER-001', 'PulseFit', true, array['smartwatch','fitness','amoled']),
  ('wearables', 'StepBand 2 Fitness Tracker', 'stepband-2', 'Lightweight band with 10-day battery and sleep tracking', 'A minimal fitness band with a colour display, blood oxygen monitoring and call notifications.', 3499, 4499, 50, 'LG-WER-002', 'PulseFit', false, array['band','fitness']),
  ('charging', 'VoltX 65W GaN Charger', 'voltx-65w', 'Foldable 65W fast charger for laptop and phone', 'GaN III technology with two USB-C and one USB-A port, support for PD 3.0 and QC 4+, in a foldable travel friendly body.', 5499, 6999, 60, 'LG-CHG-001', 'VoltX', true, array['charger','gan','fast-charging']),
  ('charging', 'FlexCord 100W USB-C Cable 2m', 'flexcord-100w', 'Braided USB-C to USB-C cable with 100W power delivery', 'Nylon braided 2 metre cable with 100W power delivery, 480Mbps data transfer and reinforced aluminium connectors.', 1799, 2499, 120, 'LG-CHG-002', 'VoltX', false, array['cable','usbc']),
  ('charging', 'CellPack 20000mAh Power Bank', 'cellpack-20000', '20000mAh power bank with 22.5W fast charging', 'Charge three devices at once with 22.5W fast charging, a digital battery display and airline safe capacity.', 6999, 8999, 30, 'LG-CHG-003', 'VoltX', false, array['powerbank','20000mah']),
  ('gaming', 'GripMax Pro Gamepad', 'gripmax-pro', 'Wireless gamepad with dual vibration for PC and mobile', 'Works on Android, PC and console with low latency wireless mode, dual vibration motors and a 12 hour battery.', 5999, 7499, 22, 'LG-GAM-001', 'GripMax', true, array['gamepad','wireless']),
  ('gaming', 'ClickX Mechanical Keyboard', 'clickx-mech', 'RGB mechanical keyboard with hot-swappable switches', 'TKL layout, per-key RGB, double shot keycaps and detachable USB-C cable. Perfect for gaming and typing.', 8499, 10999, 18, 'LG-GAM-002', 'ClickX', false, array['keyboard','mechanical','rgb'])
) as p(category_slug, name, slug, short_description, description, price, compare_price, stock, sku, brand, is_featured, tags)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;

insert into public.product_images (product_id, url, alt, sort_order, is_primary)
select p.id, i.url, p.name, i.sort_order, i.is_primary
from public.products p
join (values
  ('logapods-pro', 'assets/ph-1.svg', 1, true),
  ('logapods-pro', 'assets/ph-2.svg', 2, false),
  ('logapods-pro', 'assets/ph-3.svg', 3, false),
  ('boomx-mini', 'assets/ph-2.svg', 1, true),
  ('boomx-mini', 'assets/ph-3.svg', 2, false),
  ('pulsefit-s3', 'assets/ph-3.svg', 1, true),
  ('pulsefit-s3', 'assets/ph-1.svg', 2, false),
  ('stepband-2', 'assets/ph-1.svg', 1, true),
  ('voltx-65w', 'assets/ph-2.svg', 1, true),
  ('voltx-65w', 'assets/ph-3.svg', 2, false),
  ('flexcord-100w', 'assets/ph-3.svg', 1, true),
  ('cellpack-20000', 'assets/ph-1.svg', 1, true),
  ('gripmax-pro', 'assets/ph-2.svg', 1, true),
  ('gripmax-pro', 'assets/ph-3.svg', 2, false),
  ('clickx-mech', 'assets/ph-3.svg', 1, true),
  ('clickx-mech', 'assets/ph-1.svg', 2, false)
) as i(slug, url, sort_order, is_primary) on i.slug = p.slug
on conflict do nothing;

insert into public.product_variants (product_id, name, value, price_adjustment, stock)
select p.id, v.name, v.value, v.price_adjustment, v.stock
from public.products p
join (values
  ('logapods-pro', 'Colour', 'White', 0, 20),
  ('logapods-pro', 'Colour', 'Black', 0, 22),
  ('pulsefit-s3', 'Strap Colour', 'Black', 0, 18),
  ('pulsefit-s3', 'Strap Colour', 'Silver', 500, 17),
  ('gripmax-pro', 'Colour', 'Black', 0, 12),
  ('gripmax-pro', 'Colour', 'Red', 0, 10)
) as v(slug, name, value, price_adjustment, stock)
on v.slug = p.slug
on conflict do nothing;

insert into public.discounts (code, type, value, min_order) values
  ('WELCOME10', 'percent', 10, 3000),
  ('FLAT500', 'fixed', 500, 8000)
on conflict (code) do nothing;
