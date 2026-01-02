-- PART 1: CORE SCHEMA & SECURITY (Upload this first)

-- Enable Row Level Security (RLS) is standard, but we must enable it per table.
-- We assume Supabase Auth is used. 'auth.users' table exists automatically.

-- 1. USERS / PROFILES
-- We replace the old 'users' table with 'profiles' that links to Supabase Auth.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    job_title TEXT, -- e.g. 'Elektriker'
    rank TEXT, -- e.g. 'Meister', 'Geselle'
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('buero', 'handwerker')),
    status TEXT NOT NULL CHECK (status IN ('aktiv', 'krank', 'urlaub')) DEFAULT 'aktiv',
    vacation_days_total INTEGER DEFAULT 30,
    vacation_days_left INTEGER DEFAULT 30,
    sick_days_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
-- Policy: "Public profiles are viewable by everyone" (needed for listing employees)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING ( true );

-- Policy: "Users can update their own profile"
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- Trigger to create profile on signup (Optional but recommended)
-- This assumes you will use Supabase Auth to create users.
/*
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, username, role)
  values (new.id, new.email, new.raw_user_meta_data->>'username', COALESCE(new.raw_user_meta_data->>'role', 'handwerker'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
*/


-- 2. CUSTOMERS
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies for Customers
-- "Office and Craftsmen can view customers" 
CREATE POLICY "Enable read access for authenticated users"
ON public.customers FOR SELECT
TO authenticated
USING (true);

-- "Only Office can insert/update customers" (Assuming 'buero' role check via profiles)
CREATE POLICY "Office can manage customers"
ON public.customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'buero'
  )
);


-- 3. MATERIALS
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    default_quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Policies for Materials
CREATE POLICY "Authenticated users can view materials"
ON public.materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Office can manage materials"
ON public.materials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'buero'
  )
);


-- 4. COMPANY SETTINGS
CREATE TABLE public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_logo_url TEXT,
    default_material_list JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read access for all"
ON public.company_settings FOR SELECT
USING (true);

CREATE POLICY "Office update settings"
ON public.company_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'buero'
  )
);
