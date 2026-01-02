-- Handwerker-App DB Schema

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('buero', 'handwerker')),
    status TEXT NOT NULL CHECK (status IN ('aktiv', 'krank', 'urlaub')),
    vacation_days_total INTEGER DEFAULT 30,
    vacation_days_left INTEGER DEFAULT 30,
    sick_days_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee Stats
CREATE TABLE employees_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    completed_jobs INTEGER DEFAULT 0,
    sick_days INTEGER DEFAULT 0,
    vacation_days INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE
);

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    job_type TEXT CHECK (job_type IN ('Wartung', 'Reparatur', 'Installation')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('offen', 'geplant', 'erledigt', 'überfällig')),
    planned_start TIMESTAMP WITH TIME ZONE,
    planned_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conflict_warning BOOLEAN DEFAULT FALSE,
    checklist_completed BOOLEAN DEFAULT FALSE,
    missing_signatures BOOLEAN DEFAULT FALSE,
    overdue BOOLEAN DEFAULT FALSE
);

-- Job Assignments
CREATE TABLE job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT -- e.g. 'ausführend', 'planer'
);

-- Job History
CREATE TABLE job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    changed_by UUID REFERENCES users(id),
    change_type TEXT,
    change_description TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    uploaded_by UUID REFERENCES users(id),
    document_type TEXT, -- 'DSGVO', 'Arbeitsnachweis', 'Wartungsprotokoll'
    file_url TEXT,
    document_data JSONB, -- Stores specific form data (checklists, form inputs)
    signed_by_customer BOOLEAN DEFAULT FALSE,
    signed_by_employee BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signatures
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    signed_by UUID REFERENCES users(id), -- OR customer_id? Schema says users but likely needs flexibility
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signature_type TEXT CHECK (signature_type IN ('kunde', 'handwerker')),
    signature_image_url TEXT
);

-- Materials
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    default_quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Materials
CREATE TABLE job_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    material_id UUID REFERENCES materials(id),
    quantity INTEGER,
    description TEXT
);

-- Absence
CREATE TABLE absence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    absence_type TEXT CHECK (absence_type IN ('urlaub', 'krank')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    type TEXT,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Tracking
CREATE TABLE time_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Settings
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_logo_url TEXT,
    default_material_list JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
