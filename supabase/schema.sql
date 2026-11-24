-- ==============================================================================
-- AslCheck — Local Product Authenticity & Anti-Clone Verification Platform
-- Database Schema & Initial Seed Data for Supabase
-- ==============================================================================

-- 1. Manufacturers Table
CREATE TABLE IF NOT EXISTS public.manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    license_number TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE CASCADE,
    serial_code TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    manufacture_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    ingredients TEXT,
    scan_count INTEGER NOT NULL DEFAULT 0,
    max_safe_scans INTEGER NOT NULL DEFAULT 3,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Scan Logs Table
CREATE TABLE IF NOT EXISTS public.scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    device_info TEXT,
    location_note TEXT,
    is_report BOOLEAN NOT NULL DEFAULT false,
    report_message TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous / Public access policies for Verification & Producer features
DROP POLICY IF EXISTS "Public select manufacturers" ON public.manufacturers;
CREATE POLICY "Public select manufacturers" ON public.manufacturers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert products" ON public.products;
CREATE POLICY "Public insert products" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update products" ON public.products;
CREATE POLICY "Public update products" ON public.products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select scan_logs" ON public.scan_logs;
CREATE POLICY "Public select scan_logs" ON public.scan_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert scan_logs" ON public.scan_logs;
CREATE POLICY "Public insert scan_logs" ON public.scan_logs FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- SEED DATA (Demo Manufacturer and Live Test Products)
-- ==============================================================================

-- 1. Demo Manufacturer
INSERT INTO public.manufacturers (id, name, region, license_number, verified, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Samarqand Milliy Shirinliklari MCHJ',
    'Samarqand viloyati, Registon ko‘chasi, 14-uy',
    'UZ-REG-2024-88419',
    true,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    region = EXCLUDED.region,
    license_number = EXCLUDED.license_number,
    verified = EXCLUDED.verified;

-- 2. Demo Product 1: ASL-2026-001 (Authentic)
INSERT INTO public.products (
    id,
    manufacturer_id,
    serial_code,
    product_name,
    category,
    batch_number,
    manufacture_date,
    expiry_date,
    ingredients,
    scan_count,
    max_safe_scans,
    is_flagged,
    created_at
)
VALUES (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'ASL-2026-001',
    'Samarqand Halvosi (Elit Mag‘izli)',
    'Oziq-ovqat',
    'BATCH-2026-A1',
    '2026-01-15',
    '2026-10-15',
    'Tabiiy asal, pista mag‘zi, bodom, sut kukuni, vanil',
    1,
    3,
    false,
    NOW() - INTERVAL '10 days'
)
ON CONFLICT (serial_code) DO NOTHING;

-- 3. Demo Product 2: ASL-2026-999 (Cloned / Suspicious)
INSERT INTO public.products (
    id,
    manufacturer_id,
    serial_code,
    product_name,
    category,
    batch_number,
    manufacture_date,
    expiry_date,
    ingredients,
    scan_count,
    max_safe_scans,
    is_flagged,
    created_at
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'ASL-2026-999',
    'Tog‘ Zafaron Asali (Premium)',
    'Salomatlik',
    'BATCH-2025-Z9',
    '2025-11-20',
    '2027-11-20',
    '100% toza tog‘ asali, tabiiy zafaron ekstrakti',
    15,
    3,
    true,
    NOW() - INTERVAL '30 days'
)
ON CONFLICT (serial_code) DO NOTHING;

-- Initial logs for demo products
INSERT INTO public.scan_logs (product_id, scanned_at, device_info, location_note, is_report, report_message)
VALUES 
(
    '22222222-2222-2222-2222-222222222221',
    NOW() - INTERVAL '2 days',
    'iPhone 15 Pro (Safari)',
    'Toshkent, Mirzo Ulug‘bek tumani (QR tekshiruv)',
    false,
    NULL
),
(
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '5 hours',
    'Samsung Galaxy S24 (Chrome)',
    'Samarqand, Siyob bozori (QR tekshiruv)',
    true,
    'Ushbu qadoqdagi xuddi shu seriya raqami boshqa do‘konda ham sotilmoqda!'
),
(
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '1 day',
    'Xiaomi 14 (Mi Browser)',
    'Buxoro shahri (QR tekshiruv)',
    false,
    NULL
)
ON CONFLICT DO NOTHING;
