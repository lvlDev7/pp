-- PART 3: DOCUMENTS & STORAGE

-- 10. DOCUMENTS
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id),
    document_type TEXT, -- 'DSGVO', 'Arbeitsnachweis', 'Wartungsprotokoll'
    file_url TEXT,
    document_data JSONB, -- Stores specific form data (checklists, form inputs)
    signed_by_customer BOOLEAN DEFAULT FALSE,
    signed_by_employee BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies for Documents
CREATE POLICY "View documents"
ON public.documents FOR SELECT
USING (
  -- Office
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
  OR
  -- Assigned Handwerker
  EXISTS (
    SELECT 1 FROM public.job_assignments 
    WHERE job_id = documents.job_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Upload documents"
ON public.documents FOR INSERT
WITH CHECK (
  -- Office
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
  OR
  -- Assigned Handwerker
  EXISTS (
    SELECT 1 FROM public.job_assignments 
    WHERE job_id = documents.job_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Update documents"
ON public.documents FOR UPDATE
USING (
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buero')
   OR
   uploaded_by = auth.uid()
);


-- 11. SIGNATURES
CREATE TABLE public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    signed_by UUID REFERENCES public.profiles(id), -- Nullable if customer signs directly? Assuming Handwerker triggers it
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signature_type TEXT CHECK (signature_type IN ('kunde', 'handwerker')),
    signature_image_url TEXT
);

ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View signatures"
ON public.signatures FOR SELECT
USING (true);

CREATE POLICY "Insert signatures"
ON public.signatures FOR INSERT
WITH CHECK (
    -- Allow any authenticated user (Handwerker) to upload signature for a doc they have access to
    EXISTS (
        SELECT 1 FROM public.documents
        WHERE id = signatures.document_id
        -- AND they have access to document (implicit via RLS but good to be explicit?)
    )
);


-- 12. STORAGE BUCKETS (Optional: Run if you have permissions or create in Dashboard)
-- Attempt to create buckets for 'documents' and 'signatures'
-- Note: 'storage' schema queries often require specific admin rights or extensions.
-- If this fails, create buckets manually in Supabase Dashboard -> Storage.

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'avatars' bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar Images are public"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Avatar Uploads for authenticated"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Storage Policies (Simplified)
-- Warning: Storage policies in SQL can be complex. 
-- Best practice: "Give authenticated users INSERT access"

-- Policy: Authenticated users can upload to 'documents'
CREATE POLICY "Authenticated users can upload docs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'documents' );

CREATE POLICY "Authenticated users can view docs"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'documents' );

-- Repeat for signatures
CREATE POLICY "Authenticated users can upload signatures" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'signatures' );

CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'signatures' );
