-- FIX RLS Policies for Profiles

-- 1. DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.profiles;

-- 2. RE-CREATE Policies

-- Allow SELECT for everyone (authenticated & anon)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Allow INSERT for authenticated users (needed for 'upsert' during creation)
-- Since we use a temp client that is technically 'anon' (but has the key), or 'authenticated' if signed in.
-- Actually, the temp client performs signUp, which logs it in as the NEW user.
-- So auth.uid() should match the new ID.
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- Allow UPDATE for own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- Warning: If we are 'anon' trying to insert, we might need a broader policy if signUp hasn't established session yet.
-- But signUp returns the user, and upsert uses the client.
-- If the client is the tempClient, it holds the session of the new user.
