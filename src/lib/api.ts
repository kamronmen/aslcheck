import { supabase, isSupabaseConfigured } from './supabase';
import type {
  ProductWithManufacturer,
  Manufacturer,
  ScanLog,
  VerificationResult,
  NewProductPayload,
} from '../types';

export const DEMO_MANUFACTURER_ID = '11111111-1111-1111-1111-111111111111';

// Seed demo manufacturer
const DEMO_MANUFACTURER: Manufacturer = {
  id: DEMO_MANUFACTURER_ID,
  name: 'Samarqand Milliy Shirinliklari MCHJ',
  region: 'Samarqand viloyati, Registon ko‘chasi, 14-uy',
  license_number: 'UZ-REG-2024-88419',
  verified: true,
  created_at: '2024-01-01T00:00:00.000Z',
};

// Seed demo products
const INITIAL_DEMO_PRODUCTS: ProductWithManufacturer[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    manufacturer_id: DEMO_MANUFACTURER_ID,
    serial_code: 'ASL-2026-001',
    product_name: 'Samarqand Halvosi (Elit Mag‘izli)',
    category: 'Oziq-ovqat',
    batch_number: 'BATCH-2026-A1',
    manufacture_date: '2026-01-15',
    expiry_date: '2026-10-15',
    ingredients: 'Tabiiy asal, pista mag‘zi, bodom, sut kukuni, vanil',
    scan_count: 1,
    max_safe_scans: 3,
    is_flagged: false,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    manufacturers: DEMO_MANUFACTURER,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    manufacturer_id: DEMO_MANUFACTURER_ID,
    serial_code: 'ASL-2026-999',
    product_name: 'Tog‘ Zafaron Asali (Premium)',
    category: 'Salomatlik',
    batch_number: 'BATCH-2025-Z9',
    manufacture_date: '2025-11-20',
    expiry_date: '2027-11-20',
    ingredients: '100% toza tog‘ asali, tabiiy zafaron ekstrakti',
    scan_count: 15,
    max_safe_scans: 3,
    is_flagged: true,
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
    {
      id: 'log-3',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      device_info: 'Xiaomi 14 (Mi Browser)',
      location_note: 'Buxoro shahri (QR tekshiruv)',
      is_report: false,
      report_message: null,
    },
    {
      id: 'log-4',
      product_id: '22222222-2222-2222-2222-222222222222',
      scanned_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      device_info: 'iPhone 14 (Safari)',
      location_note: 'Qarshi shahri (QR tekshiruv)',
      is_report: false,
      report_message: null,
    },
  ],
};

// Local storage keys for resilient offline/demo fallback
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

  // If Supabase is configured, try Supabase first
  if (isSupabaseConfigured) {
    try {
      // 1. Query products joined with manufacturers
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
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
          created_at,
          manufacturers (
            id,
            name,
            region,
            license_number,
            verified,
            created_at
          )
        `)
        .ilike('serial_code', serialCode)
        .maybeSingle();

      if (productError) {
        console.warn('Supabase query error, falling back to local registry:', productError.message);
      } else if (!productData) {
        // Not found in Supabase
        return {
          status: 'NOT_FOUND',
          product: null,
          logs: [],
          errorMessage: 'Ushbu seriya kodi rasmiy bazada ro‘yxatdan o‘tmagan.',
        };
      } else {
        // Product Found in Supabase!
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

        // Anti-Clone Decision Logic:
        // Authentic: is_flagged === false AND newScanCount <= max_safe_scans
        // Suspicious: is_flagged === true OR newScanCount > max_safe_scans
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
      console.warn('Error connecting to Supabase, continuing with fallback:', err);
    }
  }

  // Resilient Local Engine (Fallback / Presentation Mode)
  const products = getLocalProducts();
  const allLogs = getLocalLogs();

  const foundIndex = products.findIndex(
    (p) => p.serial_code.trim().toUpperCase() === serialCode
  );

  if (foundIndex === -1) {
    return {
      status: 'NOT_FOUND',
      product: null,
      logs: [],
      errorMessage: 'Ushbu seriya kodi rasmiy AslCheck reyestrida topilmadi.',
    };
  }

  const existingProduct = products[foundIndex];
  const newScanCount = existingProduct.scan_count + 1;
  const updatedProduct: ProductWithManufacturer = {
    ...existingProduct,
    scan_count: newScanCount,
  };

  products[foundIndex] = updatedProduct;
  saveLocalProducts(products);

  // Add new scan log
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
      // 1. Insert report log
      await supabase.from('scan_logs').insert({
        product_id: productId,
        scanned_at: new Date().toISOString(),
        device_info: deviceInfo,
        location_note: reportLocation,
        is_report: true,
        report_message: reportMessage,
      });

      // 2. Flag product
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

/**
 * Fetch all products for the producer dashboard
 */
export async function fetchProducerProducts(): Promise<ProductWithManufacturer[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
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
          created_at,
          manufacturers (
            id,
            name,
            region,
            license_number,
            verified,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error, using local products cache:', error.message);
      } else if (data && data.length > 0) {
        return data as unknown as ProductWithManufacturer[];
      }
    } catch (err) {
      console.warn('Error fetching from Supabase:', err);
    }
  }

  return getLocalProducts();
}

/**
 * Create a new product in the registry
 */
export async function createProduct(payload: NewProductPayload): Promise<ProductWithManufacturer> {
  const serialCode =
    payload.serial_code?.trim() ||
    `ASL-2026-${Math.floor(100 + Math.random() * 900)}`;

  const newProduct: ProductWithManufacturer = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`,
    manufacturer_id: DEMO_MANUFACTURER_ID,
    serial_code: serialCode.toUpperCase(),
    product_name: payload.product_name.trim(),
    category: payload.category || 'Boshqa',
    batch_number: payload.batch_number.trim() || `BATCH-2026-X1`,
    manufacture_date: payload.manufacture_date,
    expiry_date: payload.expiry_date,
    ingredients: payload.ingredients?.trim() || null,
    scan_count: 0,
    max_safe_scans: payload.max_safe_scans || 3,
    is_flagged: false,
    created_at: new Date().toISOString(),
    manufacturers: DEMO_MANUFACTURER,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          manufacturer_id: DEMO_MANUFACTURER_ID,
          serial_code: newProduct.serial_code,
          product_name: newProduct.product_name,
          category: newProduct.category,
          batch_number: newProduct.batch_number,
          manufacture_date: newProduct.manufacture_date,
          expiry_date: newProduct.expiry_date,
          ingredients: newProduct.ingredients,
          scan_count: 0,
          max_safe_scans: newProduct.max_safe_scans,
          is_flagged: false,
        })
        .select(`
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
          created_at,
          manufacturers (
            id,
            name,
            region,
            license_number,
            verified,
            created_at
          )
        `)
        .single();

      if (error) {
        console.warn('Supabase insert failed, saving to local state:', error.message);
      } else if (data) {
        // Also sync local cache
        const current = getLocalProducts();
        saveLocalProducts([data as unknown as ProductWithManufacturer, ...current]);
        return data as unknown as ProductWithManufacturer;
      }
    } catch (err) {
      console.warn('Error saving to Supabase:', err);
    }
  }

  // Local state update
  const current = getLocalProducts();
  const updated = [newProduct, ...current];
  saveLocalProducts(updated);

  return newProduct;
}
