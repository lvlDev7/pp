-- PART 2: JOBS & ASSIGNMENTS (FIXED ORDER)

-- 1. CREATE ALL TABLES FIRST TO AVOID DEPENDENCY ERRORS

-- 5. JOBS
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    job_type TEXT CHECK (job_type IN ('Wartung', 'Reparatur', 'Installation')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('offen', 'geplant', 'erledigt', 'überfällig')) DEFAULT 'offen',
    planned_start TIMESTAMP WITH TIME ZONE,
    planned_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Flags
    conflict_warning BOOLEAN DEFAULT FALSE,
    checklist_completed BOOLEAN DEFAULT FALSE,
    missing_signatures BOOLEAN DEFAULT FALSE,
    overdue BOOLEAN DEFAULT FALSE
);

-- 6. JOB ASSIGNMENTS
CREATE TABLE public.job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT -- e.g. 'lead', 'support'
);

-- 7. JOB HISTORY
CREATE TABLE public.job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES public.profiles(id),
    change_type TEXT,
    change_description TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. JOB MATERIALS
CREATE TABLE public.job_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id),
    quantity INTEGER,
    description TEXT
);

-- 9. TIME TRACKING
CREATE TABLE public.time_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    job_id UUID REFERENCES public.jobs(id),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 2. ENABLE RLS & DEFINE POLICIES (NOW SAFE AS ALL TABLES EXIST)

-- JOBS POLICIES
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office full access to jobs"
ON public.jobs FOR ALL
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero') );

CREATE POLICY "Handwerker view open jobs"
ON public.jobs FOR SELECT
USING ( status = 'offen' );

CREATE POLICY "Handwerker view assigned jobs"
ON public.jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.job_assignments 
    WHERE job_assignments.job_id = jobs.id 
    AND job_assignments.user_id = auth.uid()
  )
);

CREATE POLICY "Handwerker update assigned jobs"
ON public.jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.job_assignments 
    WHERE job_assignments.job_id = jobs.id 
    AND job_assignments.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.job_assignments 
    WHERE job_assignments.job_id = jobs.id 
    AND job_assignments.user_id = auth.uid()
  )
);

-- JOB ASSIGNMENTS POLICIES
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office full access assignments"
ON public.job_assignments FOR ALL
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero') );

CREATE POLICY "Users can view their own assignments"
ON public.job_assignments FOR SELECT
USING ( user_id = auth.uid() );

-- JOB HISTORY POLICIES
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read access history"
ON public.job_history FOR SELECT
USING (true);

-- JOB MATERIALS POLICIES
ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View job materials"
ON public.job_materials FOR SELECT
USING (true); 

CREATE POLICY "Add/Edit materials"
ON public.job_materials FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
  OR
  EXISTS (
    SELECT 1 FROM public.job_assignments 
    WHERE job_id = job_materials.job_id 
    AND user_id = auth.uid()
  )
);

-- TIME TRACKING POLICIES
ALTER TABLE public.time_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View time tracking"
ON public.time_tracking FOR SELECT
USING (
   user_id = auth.uid() OR
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
);

CREATE POLICY "Insert time tracking"
ON public.time_tracking FOR INSERT
WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "Update own time tracking"
ON public.time_tracking FOR UPDATE
USING ( user_id = auth.uid() );
