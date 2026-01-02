-- RLS Policies for Customers and Jobs (Orders)
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS on tables (if not already enabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for CUSTOMERS
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
CREATE POLICY "Enable read access for authenticated users" ON customers
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON customers;
CREATE POLICY "Enable insert access for authenticated users" ON customers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Create Policies for JOBS (Orders)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON jobs;
CREATE POLICY "Enable read access for authenticated users" ON jobs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON jobs;
CREATE POLICY "Enable insert access for authenticated users" ON jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON jobs;
CREATE POLICY "Enable update access for authenticated users" ON jobs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


-- 4. Create Policies for JOB_ASSIGNMENTS
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON job_assignments;
CREATE POLICY "Enable read access for authenticated users" ON job_assignments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON job_assignments;
CREATE POLICY "Enable all access for authenticated users" ON job_assignments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
