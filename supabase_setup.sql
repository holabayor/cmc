-- ==========================================
-- SUPABASE SETUP: Creative Create 2026
-- ==========================================
-- This script initializes the database table, constraints, and Row Level Security (RLS)
-- policies for secure public signups. Copy and paste this directly into the Supabase SQL Editor.

-- 1. Create the registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    focus TEXT NOT NULL,
    church TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index on email for faster checkups
CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations (email);

-- 3. Enable Row Level Security (RLS) to secure client access
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow anyone (anonymous public guests) to submit registrations (INSERT)
-- This allows your website landing page form to submit new registrations without requiring client logins.
CREATE POLICY "Allow public registration inserts" 
ON public.registrations 
FOR INSERT 
WITH CHECK (true);

-- 5. Policy: Restrict reading data to authenticated users only (SELECT)
-- This protects participant lists from scrape attempts, restricting read access to administrators logged into Supabase.
CREATE POLICY "Restrict reading to authenticated administrators" 
ON public.registrations 
FOR SELECT 
TO authenticated 
USING (true);

-- 6. Policy: Restrict deletion and updates to authenticated users only (DELETE/UPDATE)
CREATE POLICY "Restrict modifications to authenticated administrators" 
ON public.registrations 
FOR ALL 
TO authenticated 
USING (true);
