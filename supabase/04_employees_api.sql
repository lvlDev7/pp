-- PART 4: EMPLOYEES & UTILITIES

-- 13. EMPLOYEE STATS
CREATE TABLE public.employees_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) UNIQUE,
    completed_jobs INTEGER DEFAULT 0,
    sick_days INTEGER DEFAULT 0,
    vacation_days INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.employees_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View employee stats"
ON public.employees_stats FOR SELECT
USING (
    -- Office sees all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
    OR
    -- User sees own
    user_id = auth.uid()
);

-- 14. ABSENCE
CREATE TABLE public.absence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    absence_type TEXT CHECK (absence_type IN ('urlaub', 'krank')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.absence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View absence"
ON public.absence FOR SELECT
USING (
    -- Office sees all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
    OR
    -- User sees own
    user_id = auth.uid()
);

CREATE POLICY "Manage absence"
ON public.absence FOR ALL
USING (
    -- Office can manage
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
    OR
    -- User can insert/update own (simplified for requests)
    user_id = auth.uid()
);


-- 15. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    type TEXT,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications"
ON public.notifications FOR SELECT
USING ( user_id = auth.uid() );

CREATE POLICY "Update own notifications"
ON public.notifications FOR UPDATE
USING ( user_id = auth.uid() );

-- Functions to update stats automatically (Optional advanced feature)
/*
CREATE OR REPLACE FUNCTION update_completed_jobs()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'erledigt' AND OLD.status != 'erledigt' THEN
        UPDATE public.employees_stats 
        SET completed_jobs = completed_jobs + 1
        WHERE user_id IN (SELECT user_id FROM public.job_assignments WHERE job_id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_job_completed
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE PROCEDURE update_completed_jobs();
*/
