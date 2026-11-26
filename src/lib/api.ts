import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Manufacturer,
  ProductWithManufacturer,
  ScanLog,
  VerificationResult,
  NewProductPayload,
  ReportWithProduct,
  RegisterCompanyPayload,
  ScanTrendPoint,
} from '../types';

export const DEMO_MANUFACTURER_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_SESSION_KEY = 'aslcheck_demo_manufacturer';

export const DEMO_MANUFACTURER: Manufacturer = {
  id: DEMO_MANUFACTURER_ID,
  name: "Chiroqchi Tog' Asali MCHJ",
  region: 'Qashqadaryo, Chiroqchi tumani',
  license_number: 'UZ-CERT-2026-8841',
  verified: true,
  created_at: '2026-01-01T00:00:00.000Z',
  owner_id: null,
  email: 'demo@aslcheck.uz',
  phone: '+998 90 123 45 67',
};

// Seed demo products for fallback when database is offline
const INITIAL_DEMO_PRODUCTS: ProductWithManufacturer[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    manufacturer_id: DEMO_MANUFACTURER_ID,
    serial_code: 'ASL-2026-001',
    product_name: "Tabiiy Tog' Asali (500g)",
    category: 'Oziq-ovqat',
    batch_number: 'BATCH-14A',
    manufacture_date: '2026-10-15',
    expiry_date: '2028-10-15',
    ingredients: "100% tabiiy tog' gullari nektari, konservantlarsiz",
    scan_count: 1,
    max_safe_scans: 3,
    is_flagged: false,
    is_claimed: false,
    claimed_at: null,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    manufacturers: DEMO_MANUFACTURER,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    manufacturer_id: DEMO_MANUFACTURER_ID,
    serial_code: 'ASL-2026-999',
    product_name: "Qora Sedana Yog'i (250ml)",
    category: 'Salomatlik',
    batch_number: 'BATCH-09B',
    manufacture_date: '2026-09-01',
    expiry_date: '2027-09-01',
    ingredients: "Sovuq siqilgan tabiiy qora sedana yog'i",
    scan_count: 15,
    max_safe_scans: 3,
    is_flagged: true,
    is_claimed: true,
    claimed_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    manufacturers: DEMO_MANUFACTURER,
  },
];

const INITIAL_DEMO_LOGS: Record<string, ScanLog[]> = {
  '22222222-2222-2222-2222-222222222221': [
    {
      id: 'log-1',
      product_id: '22222222-2222-2222-2222-222222222221',
      scanned_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      device_info: 'iPhone 15 Pro (Safari)',
      location_note: 'Toshkent, Mirzo Ulug‘bek tumani (QR tekshiruv)',
      is_report: false,
      report_message: null,
    },
  ],
  '22222222-2222-2222-2222-222222222222': [
    {
      id: 'log-2',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      device_info: 'Samsung Galaxy S24 (Chrome)',
      location_note: 'Samarqand, Siyob bozori (QR tekshiruv)',
      is_report: true,
      report_message: 'Ushbu qadoqdagi xuddi shu seriya raqami boshqa do‘konda ham sotilmoqda!',
    },
  ],
};

const LOCAL_PRODUCTS_KEY = 'aslcheck_products_cache';
const LOCAL_LOGS_KEY = 'aslcheck_logs_cache';

function getLocalProducts(): ProductWithManufacturer[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(INITIAL_DEMO_PRODUCTS));
      return INITIAL_DEMO_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_PRODUCTS;
  }
}

function saveLocalProducts(products: ProductWithManufacturer[]) {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

function getLocalLogs(): Record<string, ScanLog[]> {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(INITIAL_DEMO_LOGS));
      return INITIAL_DEMO_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_LOGS;
  }
}

function saveLocalLogs(logs: Record<string, ScanLog[]>) {
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs to local storage', e);
  }
}

export function getClientDeviceInfo(): string {
  const ua = navigator.userAgent;
  let device = 'Nomaʼlum qurilma';
  let browser = 'Brauzer';

  if (/iPhone|iPad|iPod/i.test(ua)) device = 'Apple iOS';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) device = 'macOS';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Linux/i.test(ua)) device = 'Linux';

  if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return `${device} (${browser})`;
}

/**
 * Read-only lookup for a product by serial code (used by Hybrid Vision Forensics before incrementing scan count)
 */
export async function lookupProductByCode(
  rawCode: string
): Promise<ProductWithManufacturer | null> {
  const serialCode = rawCode.trim().toUpperCase();
  if (!serialCode) return null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, manufacturers(*)')
        .ilike('serial_code', serialCode)
        .maybeSingle();

      if (!error && data) {
        return data as unknown as ProductWithManufacturer;
      }
      if (!error && !data) {
        return null;
      }
    } catch (err) {
      console.warn('Read-only lookup failed:', err);
    }
  }

  const localProducts = getLocalProducts();
  return localProducts.find((p) => p.serial_code.toUpperCase() === serialCode) || null;
}

/**
 * Core Anti-Clone Product Verification
 */
export async function verifyProduct(rawCode: string): Promise<VerificationResult> {
  const serialCode = rawCode.trim().toUpperCase();

  if (!serialCode) {
    return {
      status: 'NOT_FOUND',
      product: null,
      logs: [],
      errorMessage: 'Seriya kodi kiritilmadi',
    };
  }

  if (isSupabaseConfigured) {
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`*, manufacturers(*)`)
        .ilike('serial_code', serialCode)
        .maybeSingle();

      if (productError) {
        console.warn('Supabase query error, falling back to local registry:', productError.message);
      } else if (!productData) {
        return {
          status: 'NOT_FOUND',
          product: null,
          logs: [],
          errorMessage: 'Ushbu seriya kodi rasmiy bazada ro‘yxatdan o‘tmagan.',
        };
      } else {
        const product = productData as unknown as ProductWithManufacturer;
        const newScanCount = (product.scan_count || 0) + 1;
        const deviceInfo = getClientDeviceInfo();
        const locationNote = 'O‘zbekiston (QR tekshiruv)';

        // Increment scan count in Supabase
        await supabase
          .from('products')
          .update({ scan_count: newScanCount })
          .eq('id', product.id);

        // Insert new scan log into scan_logs
        await supabase.from('scan_logs').insert({
          product_id: product.id,
          device_info: deviceInfo,
          location_note: locationNote,
          is_report: false,
          scanned_at: new Date().toISOString(),
        });

        // Fetch latest 5 scan logs
        const { data: logsData } = await supabase
          .from('scan_logs')
          .select('*')
          .eq('product_id', product.id)
          .order('scanned_at', { ascending: false })
          .limit(5);

        const logs: ScanLog[] = logsData || [];

        const isAuthentic = !product.is_flagged && newScanCount <= product.max_safe_scans;
        const status = isAuthentic ? 'AUTHENTIC' : 'SUSPICIOUS';

        return {
          status,
          product: {
            ...product,
            scan_count: newScanCount,
          },
          logs,
        };
      }
    } catch (err) {
      console.warn('Network/Supabase error, using local fallback:', err);
    }
  }

  // Fallback to localStorage simulation
  const localProducts = getLocalProducts();
  const foundIdx = localProducts.findIndex(
    (p) => p.serial_code.toUpperCase() === serialCode
  );

  if (foundIdx === -1) {
    return {
      status: 'NOT_FOUND',
      product: null,
      logs: [],
      errorMessage: 'Ushbu seriya kodi rasmiy bazada ro‘yxatdan o‘tmagan.',
    };
  }

  const foundProduct = localProducts[foundIdx];
  const newScanCount = (foundProduct.scan_count || 0) + 1;

  const updatedProduct: ProductWithManufacturer = {
    ...foundProduct,
    scan_count: newScanCount,
  };
  localProducts[foundIdx] = updatedProduct;
  saveLocalProducts(localProducts);

  const allLogs = getLocalLogs();
  const newLog: ScanLog = {
    id: `log-${Date.now()}`,
    product_id: updatedProduct.id,
    scanned_at: new Date().toISOString(),
    device_info: getClientDeviceInfo(),
    location_note: 'O‘zbekiston (QR tekshiruv)',
    is_report: false,
    report_message: null,
  };

  const productLogs = allLogs[updatedProduct.id] || [];
  const updatedLogs = [newLog, ...productLogs].slice(0, 5);
  allLogs[updatedProduct.id] = updatedLogs;
  saveLocalLogs(allLogs);

  const isAuthentic = !updatedProduct.is_flagged && newScanCount <= updatedProduct.max_safe_scans;
  const status = isAuthentic ? 'AUTHENTIC' : 'SUSPICIOUS';

  return {
    status,
    product: updatedProduct,
    logs: updatedLogs,
  };
}

/**
 * Claim ownership of a product ("Sotib oldim — Kodni band qilish")
 */
export async function claimProduct(
  productId: string
): Promise<{ success: boolean; claimed_at: string }> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_claimed: true,
          claimed_at: now,
        })
        .eq('id', productId);

      if (error) {
        console.warn('Supabase claim update error:', error.message);
      }
    } catch (err) {
      console.warn('Error claiming product in Supabase:', err);
    }
  }

  // Update local storage cache
  const products = getLocalProducts();
  const idx = products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    products[idx] = {
      ...products[idx],
      is_claimed: true,
      claimed_at: now,
    };
    saveLocalProducts(products);
  }

  return { success: true, claimed_at: now };
}

/**
 * Report a suspicious / fake product
 */
export async function reportFakeProduct(
  productId: string,
  location: string,
  comment: string
): Promise<boolean> {
  const deviceInfo = getClientDeviceInfo();
  const reportLocation = location.trim() || 'O‘zbekiston (Do‘kon/Manzil ko‘rsatilmadi)';
  const reportMessage = comment.trim();

  if (isSupabaseConfigured) {
    try {
      await supabase.from('scan_logs').insert({
        product_id: productId,
        scanned_at: new Date().toISOString(),
        device_info: deviceInfo,
        location_note: reportLocation,
        is_report: true,
        report_message: reportMessage,
      });

      await supabase
        .from('products')
        .update({ is_flagged: true })
        .eq('id', productId);

      return true;
    } catch (err) {
      console.warn('Failed to submit report to Supabase, updating local fallback:', err);
    }
  }

  // Local fallback
  const products = getLocalProducts();
  const allLogs = getLocalLogs();

  const idx = products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    products[idx].is_flagged = true;
    saveLocalProducts(products);
  }

  const newLog: ScanLog = {
    id: `report-${Date.now()}`,
    product_id: productId,
    scanned_at: new Date().toISOString(),
    device_info: deviceInfo,
    location_note: reportLocation,
    is_report: true,
    report_message: reportMessage,
  };

  const currentLogs = allLogs[productId] || [];
  allLogs[productId] = [newLog, ...currentLogs].slice(0, 5);
  saveLocalLogs(allLogs);

  return true;
}

// ============================================================================
// MULTI-TENANT PRODUCER AUTH & SESSION MANAGEMENT
// ============================================================================

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email yoki parol noto‘g‘ri kiritildi.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email manzilingiz hali tasdiqlanmagan. Pochtadagi tasdiqlash havolasini bosing.';
  }
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'Ushbu email manzili bilan korxona allaqachon ro‘yxatdan o‘tgan.';
  }
  if (lower.includes('password') && lower.includes('6')) {
    return 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Juda ko‘p urinish qilindi. Biroz kutib qaytadan urinib ko‘ring.';
  }
  return message;
}

export async function fetchManufacturerById(id: string): Promise<Manufacturer | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('manufacturers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as Manufacturer;
      }
    } catch (err) {
      console.warn('Error fetching manufacturer by id:', err);
    }
  }

  if (id === DEMO_MANUFACTURER_ID) {
    return DEMO_MANUFACTURER;
  }
  return null;
}

export async function fetchManufacturerByOwner(ownerId: string): Promise<Manufacturer | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (!error && data) {
      return data as Manufacturer;
    }
  } catch (err) {
    console.warn('Error fetching manufacturer by owner:', err);
  }
  return null;
}

async function ensureManufacturerRecordForUser(user: any): Promise<Manufacturer> {
  const existing = await fetchManufacturerByOwner(user.id);
  if (existing) return existing;

  // Recover pending registration metadata from user_metadata or localStorage
  let meta: any = user.user_metadata || {};
  try {
    const cached = localStorage.getItem(`aslcheck_pending_mfr_${user.id}`);
    if (cached) {
      meta = { ...meta, ...JSON.parse(cached) };
    }
  } catch {
    // Ignore storage read error
  }

  const insertRow = {
    owner_id: user.id,
    name: String(meta.company_name || meta.name || user.email?.split('@')[0] || 'Yangi Korxona'),
    region: String(meta.region || 'O‘zbekiston'),
    license_number: String(meta.license_number || `UZ-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`),
    email: user.email || meta.email || null,
    phone: meta.phone ? String(meta.phone) : null,
    verified: true,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('manufacturers')
    .insert(insertRow)
    .select('*')
    .single();

  if (insertError) {
    throw new Error(`Korxona profilini yaratib bo‘lmadi: ${insertError.message}`);
  }

  try {
    localStorage.removeItem(`aslcheck_pending_mfr_${user.id}`);
  } catch {
    // Ignore
  }

  return inserted as Manufacturer;
}

export async function restoreProducerSession(): Promise<{
  manufacturer: Manufacturer;
  isDemo: boolean;
} | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const manufacturer = await ensureManufacturerRecordForUser(user);
        return { manufacturer, isDemo: false };
      }
    } catch (err) {
      console.warn('Error restoring Supabase auth session:', err);
    }
  }

  try {
    if (sessionStorage.getItem(DEMO_SESSION_KEY) === DEMO_MANUFACTURER_ID) {
      const demo = (await fetchManufacturerById(DEMO_MANUFACTURER_ID)) || DEMO_MANUFACTURER;
      return { manufacturer: demo, isDemo: true };
    }
  } catch {
    // Ignore sessionStorage error
  }

  return null;
}

export async function loginProducerAccount(
  email: string,
  password: string
): Promise<Manufacturer> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase ulanishi sozlanmagan.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    throw new Error(translateAuthError(error?.message || 'Kirishda xatolik yuz berdi.'));
  }

  const manufacturer = await ensureManufacturerRecordForUser(data.user);

  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Ignore
  }

  return manufacturer;
}

export async function registerProducerAccount(
  payload: RegisterCompanyPayload
): Promise<{
  manufacturer: Manufacturer | null;
  requiresEmailConfirmation: boolean;
}> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase ulanishi sozlanmagan.');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        company_name: payload.name.trim(),
        region: payload.region.trim(),
        license_number: payload.license_number.trim().toUpperCase(),
        phone: payload.phone.trim(),
      },
    },
  });

  if (authError || !authData.user) {
    throw new Error(translateAuthError(authError?.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi.'));
  }

  const user = authData.user;
  const companyRow = {
    owner_id: user.id,
    name: payload.name.trim(),
    region: payload.region.trim(),
    license_number: payload.license_number.trim().toUpperCase(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    verified: true,
  };

  try {
    localStorage.setItem(`aslcheck_pending_mfr_${user.id}`, JSON.stringify(companyRow));
  } catch {
    // Ignore storage error
  }

  // Attempt immediate manufacturer creation
  const { data: inserted, error: insertError } = await supabase
    .from('manufacturers')
    .insert(companyRow)
    .select('*')
    .maybeSingle();

  if (insertError) {
    console.warn('Manufacturer insert after signup:', insertError.message);
    if (!authData.session) {
      return { manufacturer: null, requiresEmailConfirmation: true };
    }
    throw new Error(`Korxonani saqlashda xatolik: ${insertError.message}`);
  }

  if (!authData.session) {
    return { manufacturer: null, requiresEmailConfirmation: true };
  }

  try {
    localStorage.removeItem(`aslcheck_pending_mfr_${user.id}`);
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Ignore
  }

  return {
    manufacturer: (inserted as Manufacturer) || (await ensureManufacturerRecordForUser(user)),
    requiresEmailConfirmation: false,
  };
}

export async function enterDemoProducerMode(): Promise<Manufacturer> {
  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, DEMO_MANUFACTURER_ID);
  } catch {
    // Ignore
  }
  return (await fetchManufacturerById(DEMO_MANUFACTURER_ID)) || DEMO_MANUFACTURER;
}

export async function logoutProducerAccount(): Promise<void> {
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    sessionStorage.removeItem('aslcheck_producer_pin');
  } catch {
    // Ignore
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  }
}

// ============================================================================
// STRICTLY MULTI-TENANT ISOLATED PRODUCER QUERIES
// ============================================================================

/**
 * Fetch products belonging strictly to manufacturerId
 */
export async function fetchProducerProducts(
  manufacturerId: string
): Promise<ProductWithManufacturer[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`*, manufacturers(*)`)
        .eq('manufacturer_id', manufacturerId)
        .order('created_at', { ascending: false });

      if (!error) {
        return (data || []) as unknown as ProductWithManufacturer[];
      }
      console.warn('Supabase fetch error, using tenant-filtered local cache:', error.message);
    } catch (err) {
      console.warn('Error fetching from Supabase:', err);
    }
  }

  return getLocalProducts().filter((p) => p.manufacturer_id === manufacturerId);
}

/**
 * Fetch counterfeit reports strictly belonging to manufacturerId
 */
export async function fetchReports(manufacturerId: string): Promise<ReportWithProduct[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('scan_logs')
        .select(`
          id,
          product_id,
          scanned_at,
          device_info,
          location_note,
          is_report,
          report_message,
          products!inner (
            id,
            serial_code,
            product_name,
            manufacturer_id
          )
        `)
        .eq('is_report', true)
        .eq('products.manufacturer_id', manufacturerId)
        .order('scanned_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          scanned_at: item.scanned_at,
          device_info: item.device_info,
          location_note: item.location_note,
          is_report: item.is_report,
          report_message: item.report_message,
          product: item.products || null,
        }));
      }
      if (error) {
        console.warn('Supabase fetch reports error, using local cache:', error.message);
      }
    } catch (err) {
      console.warn('Error fetching reports from Supabase:', err);
    }
  }

  // Local fallback strictly isolated to manufacturerId
  const allLogs = getLocalLogs();
  const products = getLocalProducts().filter((p) => p.manufacturer_id === manufacturerId);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const reports: ReportWithProduct[] = [];
  Object.values(allLogs).forEach((logList) => {
    logList.forEach((log) => {
      if (log.is_report) {
        const prod = productMap.get(log.product_id);
        if (prod) {
          reports.push({
            ...log,
            product: {
              id: prod.id,
              serial_code: prod.serial_code,
              product_name: prod.product_name,
              manufacturer_id: prod.manufacturer_id,
            },
          });
        }
      }
    });
  });

  return reports.sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  );
}

/**
 * Fetch 7-day scan activity strictly isolated to manufacturerId
 */
export async function fetchScanTrend(
  manufacturerId: string,
  days: number = 7
): Promise<ScanTrendPoint[]> {
  const dayBuckets = new Map<string, { scans: number; reports: number; label: string }>();
  const now = new Date();
  const monthsUz = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const label = `${d.getDate()}-${monthsUz[d.getMonth()]}`;
    dayBuckets.set(key, { scans: 0, reports: 0, label });
  }

  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  let rawLogs: Array<{ scanned_at: string; is_report: boolean }> = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('scan_logs')
        .select('scanned_at, is_report, products!inner(manufacturer_id)')
        .eq('products.manufacturer_id', manufacturerId)
        .gte('scanned_at', startDate.toISOString())
        .order('scanned_at', { ascending: true });

      if (!error && data) {
        rawLogs = data.map((row: any) => ({
          scanned_at: row.scanned_at,
          is_report: Boolean(row.is_report),
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch 7-day scan trend:', err);
    }
  } else {
    const allLogs = getLocalLogs();
    const myProductIds = new Set(
      getLocalProducts()
        .filter((p) => p.manufacturer_id === manufacturerId)
        .map((p) => p.id)
    );
    Object.values(allLogs).forEach((list) => {
      list.forEach((l) => {
        if (myProductIds.has(l.product_id)) {
          rawLogs.push({ scanned_at: l.scanned_at, is_report: l.is_report });
        }
      });
    });
  }

  for (const log of rawLogs) {
    const key = String(log.scanned_at).split('T')[0];
    const bucket = dayBuckets.get(key);
    if (bucket) {
      if (log.is_report) bucket.reports += 1;
      else bucket.scans += 1;
    }
  }

  return Array.from(dayBuckets.entries()).map(([date, val]) => ({
    date,
    label: val.label,
    scans: val.scans,
    reports: val.reports,
  }));
}

/**
 * Delete a product strictly scoped to manufacturerId
 */
export async function deleteProduct(
  productId: string,
  manufacturerId?: string
): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('products').delete().eq('id', productId);
      if (manufacturerId) {
        query = query.eq('manufacturer_id', manufacturerId);
      }
      const { error } = await query;
      if (error) {
        console.warn('Supabase delete error:', error.message);
      }
    } catch (err) {
      console.warn('Error deleting from Supabase:', err);
    }
  }

  // Local cache delete
  const products = getLocalProducts();
  const filtered = products.filter(
    (p) => !(p.id === productId && (!manufacturerId || p.manufacturer_id === manufacturerId))
  );
  saveLocalProducts(filtered);

  return true;
}

/**
 * Create a single or batch of products owned by the active manufacturer
 */
export async function createBatchProducts(
  payload: NewProductPayload,
  count: number = 1,
  manufacturer: Manufacturer = DEMO_MANUFACTURER
): Promise<ProductWithManufacturer[]> {
  const safeCount = Math.max(1, Math.min(20, count));
  const baseSerialPrefix = 'ASL-2026-';
  const startNum = Math.floor(1000 + Math.random() * 8000);

  const newProducts: ProductWithManufacturer[] = [];

  for (let i = 0; i < safeCount; i++) {
    const code =
      safeCount === 1 && payload.serial_code?.trim()
        ? payload.serial_code.trim().toUpperCase()
        : `${baseSerialPrefix}${startNum + i}`;

    const prod: ProductWithManufacturer = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `prod-${Date.now()}-${i}`,
      manufacturer_id: manufacturer.id,
      serial_code: code,
      product_name: payload.product_name.trim(),
      category: payload.category || 'Boshqa',
      batch_number: payload.batch_number.trim() || 'BATCH-2026-X1',
      manufacture_date: payload.manufacture_date,
      expiry_date: payload.expiry_date,
      ingredients: payload.ingredients?.trim() || null,
      scan_count: 0,
      max_safe_scans: payload.max_safe_scans || 3,
      is_flagged: false,
      is_claimed: false,
      claimed_at: null,
      created_at: new Date().toISOString(),
      manufacturers: manufacturer,
    };
    newProducts.push(prod);
  }

  if (isSupabaseConfigured) {
    try {
      const rowsToInsert = newProducts.map((p) => ({
        manufacturer_id: manufacturer.id,
        serial_code: p.serial_code,
        product_name: p.product_name,
        category: p.category,
        batch_number: p.batch_number,
        manufacture_date: p.manufacture_date,
        expiry_date: p.expiry_date,
        ingredients: p.ingredients,
        scan_count: 0,
        max_safe_scans: p.max_safe_scans,
        is_flagged: false,
      }));

      const { data, error } = await supabase
        .from('products')
        .insert(rowsToInsert)
        .select(`*, manufacturers(*)`);

      if (error) {
        console.warn('Supabase batch insert error, using local items:', error.message);
      } else if (data) {
        const returned = data as unknown as ProductWithManufacturer[];
        const current = getLocalProducts();
        saveLocalProducts([...returned, ...current]);
        return returned;
      }
    } catch (err) {
      console.warn('Error saving batch to Supabase:', err);
    }
  }

  const current = getLocalProducts();
  saveLocalProducts([...newProducts, ...current]);
  return newProducts;
}

export async function createProduct(
  payload: NewProductPayload,
  manufacturer: Manufacturer = DEMO_MANUFACTURER
): Promise<ProductWithManufacturer> {
  const result = await createBatchProducts(payload, 1, manufacturer);
  return result[0];
}
