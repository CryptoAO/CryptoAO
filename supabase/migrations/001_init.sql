create extension if not exists vector;

create table profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('kid', 'parent', 'admin')),
  display_name text,
  parent_pin text,
  created_at timestamptz default now()
);

create table learning_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null,
  grade text not null,
  subject text not null,
  skill_id text not null,
  difficulty int not null,
  body text not null,
  embedding vector(1536),
  status text not null default 'draft',
  created_at timestamptz default now()
);

create table mastery (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid references profiles(id),
  skill_id text not null,
  mastery_score int not null default 0,
  last_updated timestamptz default now()
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid references profiles(id),
  item_id text not null,
  item_type text not null,
  acquired_at timestamptz default now()
);

create table safety_events (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid references profiles(id),
  category text not null,
  occurred_at timestamptz default now()
);

create table daily_packs (
  id uuid primary key default gen_random_uuid(),
  pack_date date not null,
  payload jsonb not null,
  created_at timestamptz default now()
);
