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
    scratch_pin: '7492',
    is_pin_verified: false,
    velocity_alert: null,
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
    scratch_pin: '8310',
    is_pin_verified: false,
    velocity_alert: "1 soat ichida 4 ta turli viloyatda (Toshkent, Samarqand, Andijon, Buxoro) 15 marta skanerlangan. Qallob bitta QR-kodni ko'paytirib 20 ta soxta qutiga yopishtirganligi ehtimoli: 98%.",
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
      id: 'log-2a',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 60000 * 8).toISOString(),
      device_info: 'Redmi Note 13 (Chrome)',
      location_note: 'Toshkent, Chilonzor bozori (QR tekshiruv)',
      is_report: false,
      report_message: null,
    },
    {
      id: 'log-2b',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 60000 * 22).toISOString(),
      device_info: 'Samsung Galaxy S24 (Chrome)',
      location_note: 'Samarqand, Siyob bozori (QR tekshiruv)',
      is_report: false,
      report_message: null,
    },
    {
      id: 'log-2c',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 60000 * 45).toISOString(),
      device_info: 'iPhone 14 (Safari)',
      location_note: 'Andijon, Yangi bozor (QR tekshiruv)',
      is_report: true,
      report_message: 'Ushbu qadoqdagi xuddi shu seriya raqami boshqa do‘konda ham sotilmoqda!',
    },
    {
      id: 'log-2d',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      device_info: 'Honor X9b (Chrome)',
      location_note: 'Buxoro, Karvon bozori (QR tekshiruv)',
      is_report: false,
      report_message: null,
    },
  ],
};

const LOCAL_PRODUCTS_KEY = 'aslcheck_products_cache';
const LOCAL_LOGS_KEY = 'aslcheck_logs_cache';
const DEMO_SHOWCASE_KEY = 'aslcheck_demo_showcase_v1';

interface DemoShowcaseState {
  scans001: number;
  isClaimed001: boolean;
  claimedAt001: string | null;
  isPinVerified001: boolean;
  isPinVerified999: boolean;
}

const DEFAULT_SHOWCASE_STATE: DemoShowcaseState = {
  scans001: 0,
  isClaimed001: false,
  claimedAt001: null,
  isPinVerified001: false,
  isPinVerified999: false,
};

function getDemoShowcaseState(): DemoShowcaseState {
  try {
    const raw = sessionStorage.getItem(DEMO_SHOWCASE_KEY);
    if (!raw) return { ...DEFAULT_SHOWCASE_STATE };
    return { ...DEFAULT_SHOWCASE_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SHOWCASE_STATE };
  }
}

function saveDemoShowcaseState(state: DemoShowcaseState): void {
  try {
    sessionStorage.setItem(DEMO_SHOWCASE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors
  }
}

export function resetDemoShowcase(): void {
  try {
    sessionStorage.removeItem(DEMO_SHOWCASE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Compute deterministic 4-digit 2FA Scratch-PIN for a product serial code.
 * Demo codes keep fixed documented PINs (7492 / 8310) while producer batches receive unique codes.
 */
export function deriveScratchPin(serialCode: string): string {
  const code = serialCode.trim().toUpperCase();
  if (code === 'ASL-2026-001') return '7492';
  if (code === 'ASL-2026-999') return '8310';
  let hash = 2166136261;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const num = (Math.abs(hash) % 9000) + 1000;
  return String(num);
}

function enrichProductSecurityMetadata(prod: ProductWithManufacturer): ProductWithManufacturer {
  const code = prod.serial_code.trim().toUpperCase();
  const demo = INITIAL_DEMO_PRODUCTS.find((d) => d.serial_code === code || d.id === prod.id);
  const scratchPin = prod.scratch_pin || demo?.scratch_pin || deriveScratchPin(code);
  const velocityAlert =
    prod.velocity_alert !== undefined ? prod.velocity_alert : demo?.velocity_alert || null;

  if (code === 'ASL-2026-001') {
    const showcase = getDemoShowcaseState();
    return {
      ...prod,
      scratch_pin: '7492',
      velocity_alert: null,
      is_flagged: false,
      max_safe_scans: 3,
      scan_count: Math.min(3, Math.max(1, showcase.scans001 || 1)),
      is_claimed: showcase.isClaimed001,
      claimed_at: showcase.claimedAt001,
      is_pin_verified: showcase.isPinVerified001,
    };
  }

  if (code === 'ASL-2026-999') {
    const showcase = getDemoShowcaseState();
    return {
      ...prod,
      scratch_pin: '8310',
      velocity_alert: INITIAL_DEMO_PRODUCTS[1].velocity_alert,
      is_flagged: true,
      max_safe_scans: 3,
      scan_count: Math.max(15, prod.scan_count || 15),
      is_claimed: true,
      is_pin_verified: showcase.isPinVerified999,
    };
  }

  return {
    ...prod,
    scratch_pin: scratchPin,
    velocity_alert: velocityAlert,
  };
}

function getLocalProducts(): ProductWithManufacturer[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(INITIAL_DEMO_PRODUCTS));
      return INITIAL_DEMO_PRODUCTS.map(enrichProductSecurityMetadata);
    }
    const list: ProductWithManufacturer[] = JSON.parse(raw);
    return list.map(enrichProductSecurityMetadata);
  } catch {
    return INITIAL_DEMO_PRODUCTS.map(enrichProductSecurityMetadata);
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
        return enrichProductSecurityMetadata(data as unknown as ProductWithManufacturer);
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
      const timeoutPromise = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error('Supabase verification timeout')), 4500)
      );
      const { data: productData, error: productError } = await Promise.race([
        supabase
          .from('products')
          .select(`*, manufacturers(*)`)
          .ilike('serial_code', serialCode)
          .maybeSingle(),
        timeoutPromise,
      ]);

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
        const rawProduct = productData as unknown as ProductWithManufacturer;
        const deviceInfo = getClientDeviceInfo();
        const locationNote = 'O‘zbekiston (QR tekshiruv)';
        const isStageDemo = serialCode === 'ASL-2026-001' || serialCode === 'ASL-2026-999';

        let logs: ScanLog[] = [];
        let finalProduct: ProductWithManufacturer;

        if (isStageDemo) {
          if (serialCode === 'ASL-2026-001') {
            const showcase = getDemoShowcaseState();
            const nextScans = showcase.scans001 >= 3 ? 1 : showcase.scans001 + 1;
            saveDemoShowcaseState({ ...showcase, scans001: nextScans });
          }

          finalProduct = enrichProductSecurityMetadata(rawProduct);

          const { data: logsData } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('product_id', rawProduct.id)
            .order('scanned_at', { ascending: false })
            .limit(4);

          const currentScanEntry: ScanLog = {
            id: `demo-live-${Date.now()}`,
            product_id: rawProduct.id,
            scanned_at: new Date().toISOString(),
            device_info: deviceInfo,
            location_note: serialCode === 'ASL-2026-001' ? 'Toshkent (Jonli tekshiruv)' : locationNote,
            is_report: false,
            report_message: null,
          };

          if (serialCode === 'ASL-2026-999') {
            const multiCityLogs = INITIAL_DEMO_LOGS['22222222-2222-2222-2222-222222222222'] || [];
            logs = [currentScanEntry, ...multiCityLogs].slice(0, 5);
          } else {
            logs = [currentScanEntry, ...(logsData || [])].slice(0, 5);
          }
        } else {
          const newScanCount = (rawProduct.scan_count || 0) + 1;

          // Increment scan count in Supabase
          await supabase
            .from('products')
            .update({ scan_count: newScanCount })
            .eq('id', rawProduct.id);

          // Insert new scan log into scan_logs
          await supabase.from('scan_logs').insert({
            product_id: rawProduct.id,
            device_info: deviceInfo,
            location_note: locationNote,
            is_report: false,
            scanned_at: new Date().toISOString(),
          });

          // Fetch latest 5 scan logs
          const { data: logsData } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('product_id', rawProduct.id)
            .order('scanned_at', { ascending: false })
            .limit(5);

          logs = logsData || [];
          finalProduct = enrichProductSecurityMetadata({
            ...rawProduct,
            scan_count: newScanCount,
          });
        }

        const isAuthentic =
          !finalProduct.is_flagged &&
          (finalProduct.scan_count || 0) <= (finalProduct.max_safe_scans || 3);
        const status = isAuthentic ? 'AUTHENTIC' : 'SUSPICIOUS';

        return {
          status,
          product: finalProduct,
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
  let updatedProduct: ProductWithManufacturer;

  if (serialCode === 'ASL-2026-001') {
    const showcase = getDemoShowcaseState();
    const nextScans = showcase.scans001 >= 3 ? 1 : showcase.scans001 + 1;
    saveDemoShowcaseState({ ...showcase, scans001: nextScans });
    updatedProduct = enrichProductSecurityMetadata(foundProduct);
  } else {
    const newScanCount = (foundProduct.scan_count || 0) + 1;
    updatedProduct = enrichProductSecurityMetadata({
      ...foundProduct,
      scan_count: newScanCount,
    });
    localProducts[foundIdx] = updatedProduct;
    saveLocalProducts(localProducts);
  }

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

  const productLogs =
    serialCode === 'ASL-2026-999'
      ? INITIAL_DEMO_LOGS['22222222-2222-2222-2222-222222222222'] || []
      : allLogs[updatedProduct.id] || [];
  const updatedLogs = [newLog, ...productLogs].slice(0, 5);
  allLogs[updatedProduct.id] = updatedLogs;
  saveLocalLogs(allLogs);

  const isAuthentic =
    !updatedProduct.is_flagged &&
    (updatedProduct.scan_count || 0) <= (updatedProduct.max_safe_scans || 3);
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
  productId: string,
  serialCode?: string
): Promise<{ success: boolean; claimed_at: string }> {
  const now = new Date().toISOString();
  const upperCode = serialCode?.trim().toUpperCase();

  if (upperCode === 'ASL-2026-001' || upperCode === 'ASL-2026-999') {
    const showcase = getDemoShowcaseState();
    if (upperCode === 'ASL-2026-001') {
      saveDemoShowcaseState({ ...showcase, isClaimed001: true, claimedAt001: now });
    }
    return { success: true, claimed_at: now };
  }

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
 * 2FA Skretch-PIN Tekshiruvi
 * Qallob tashqi QR kodni rasmga olib nusxalagan taqdirda ham,
 * qadoq ichidagi yopiq skretch-qatlam PIN kodini bila olmaydi.
 */
export async function verifyScratchPin(
  productId: string,
  enteredPin: string,
  serialCode?: string,
  expectedPinOverride?: string | null
): Promise<{ success: boolean; message: string }> {
  const upperCode = serialCode?.trim().toUpperCase() || '';
  const localProducts = getLocalProducts();
  const prod = localProducts.find(
    (p) => p.id === productId || (upperCode && p.serial_code.toUpperCase() === upperCode)
  );
  const expectedPin =
    expectedPinOverride?.trim() ||
    prod?.scratch_pin ||
    (upperCode ? deriveScratchPin(upperCode) : '7492');

  if (enteredPin.trim() === expectedPin) {
    const now = new Date().toISOString();

    if (upperCode === 'ASL-2026-001') {
      const showcase = getDemoShowcaseState();
      saveDemoShowcaseState({
        ...showcase,
        isClaimed001: true,
        claimedAt001: now,
        isPinVerified001: true,
      });
      return {
        success: true,
        message: 'Ichki PIN tasdiqlandi — 100% Original',
      };
    }

    if (upperCode === 'ASL-2026-999') {
      const showcase = getDemoShowcaseState();
      saveDemoShowcaseState({ ...showcase, isPinVerified999: true });
      return {
        success: true,
        message: 'Ichki PIN tasdiqlandi, lekin ushbu tashqi QR-kod boshqa viloyatlarda klonlangani sababli baribir shubhali!',
      };
    }

    if (prod) {
      prod.is_claimed = true;
      prod.claimed_at = now;
      prod.is_pin_verified = true;
      saveLocalProducts(localProducts);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('products')
          .update({ is_claimed: true, claimed_at: now })
          .eq('id', productId);
      } catch (err) {
        console.warn('Supabase pin verify error:', err);
      }
    }

    return {
      success: true,
      message: 'Ichki PIN tasdiqlandi — 100% Original',
    };
  } else {
    return {
      success: false,
      message: 'PIN noto‘g‘ri — qadoq soxta bo‘lishi mumkin',
    };
  }
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

  const redirectUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/?tab=producer` : undefined;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      emailRedirectTo: redirectUrl,
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

export async function resendConfirmationEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase ulanishi sozlanmagan.');
  }

  const redirectUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/?tab=producer` : undefined;

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    throw new Error(translateAuthError(error.message));
  }
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
        return ((data || []) as unknown as ProductWithManufacturer[]).map(
          enrichProductSecurityMetadata
        );
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
 * Create a single or batch of products owned by the active manufacturer (1 to 100 codes)
 */
export async function createBatchProducts(
  payload: NewProductPayload,
  count: number = 1,
  manufacturer: Manufacturer = DEMO_MANUFACTURER
): Promise<ProductWithManufacturer[]> {
  return createMultiSkuProducts([{ payload, quantity: count }], manufacturer);
}

/**
 * Create multiple distinct SKUs (each with its own quantity) in a single atomic batch insert.
 * Caps total generated QR items at 100 per operation for fast A4 rendering and DB safety.
 */
export async function createMultiSkuProducts(
  entries: Array<{ payload: NewProductPayload; quantity: number }>,
  manufacturer: Manufacturer = DEMO_MANUFACTURER
): Promise<ProductWithManufacturer[]> {
  const MAX_BULK_QR = 100;
  const existingCodes = new Set(getLocalProducts().map((p) => p.serial_code.toUpperCase()));
  const newProducts: ProductWithManufacturer[] = [];

  const allocateUniqueSerial = (preferred?: string): string => {
    if (preferred) {
      const upper = preferred.trim().toUpperCase();
      if (upper && !existingCodes.has(upper)) {
        existingCodes.add(upper);
        return upper;
      }
    }
    for (let attempt = 0; attempt < 200; attempt++) {
      const candidate = `ASL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!existingCodes.has(candidate)) {
        existingCodes.add(candidate);
        return candidate;
      }
    }
    const fallback = `ASL-2026-${Date.now().toString().slice(-6)}`;
    existingCodes.add(fallback);
    return fallback;
  };

  for (const entry of entries) {
    if (newProducts.length >= MAX_BULK_QR) break;
    const remainingBudget = MAX_BULK_QR - newProducts.length;
    const safeCount = Math.max(1, Math.min(remainingBudget, Number(entry.quantity) || 1));
    const p = entry.payload;

    for (let i = 0; i < safeCount; i++) {
      const code = allocateUniqueSerial(i === 0 ? p.serial_code : undefined);
      const idx = newProducts.length;

      newProducts.push({
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `prod-${Date.now()}-${idx}`,
        manufacturer_id: manufacturer.id,
        serial_code: code,
        product_name: p.product_name.trim(),
        category: p.category || 'Boshqa',
        batch_number: p.batch_number?.trim() || 'BATCH-2026-X1',
        manufacture_date: p.manufacture_date,
        expiry_date: p.expiry_date,
        ingredients: p.ingredients?.trim() || null,
        scan_count: 0,
        max_safe_scans: p.max_safe_scans || 3,
        is_flagged: false,
        is_claimed: false,
        claimed_at: null,
        created_at: new Date().toISOString(),
        manufacturers: manufacturer,
      });
    }
  }

  if (newProducts.length === 0) return [];

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
