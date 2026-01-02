-- TEMPLATE: Drop and Recreate a Table
-- Replace 'table_name' with your actual table name (e.g., job_assignments, employees_stats)

-- 1. DROP (Löschen)
-- CASCADE deletes all dependencies (like Foreign Keys in other tables pointing to this one)
DROP TABLE IF EXISTS public.table_name CASCADE;

-- 2. CREATE (Neu erstellen)
CREATE TABLE public.table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Add your columns here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE RLS (Security)
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (Rechte wiederherstellen)
CREATE POLICY "Policy Name" 
ON public.table_name FOR SELECT 
USING (true);


-- SPECIAL CASE: Storage Buckets (e.g. 'avatars')
-- Buckets are rows in storage.buckets, not tables themselves.
/*
DELETE FROM storage.buckets WHERE id = 'avatars';
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
*/
