-- Create custom users table storing username and password hash
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.app_users enable row level security;

-- Prevent public access to password hashes from the client
create policy "No direct public access" on public.app_users
  for all using (false);