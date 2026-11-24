import { supabase, isSupabaseConfigured } from './supabase';
import type {
  ProductWithManufacturer,
  Manufacturer,
  ScanLog,
  VerificationResult,
  NewProductPayload,
  ReportWithProduct,
} from '../types';

export const DEMO_MANUFACTURER_ID = '11111111-1111-1111-1111-111111111111';

// Seed demo manufacturer
const DEMO_MANUFACTURER: Manufacturer = {
  id: DEMO_MANUFACTURER_ID,
  name: 'Chiroqchi Tog‘ Asali MCHJ',
  region: 'Qashqadaryo, Chiroqchi tumani',
  license_number: 'UZ-CERT-2026-8841',
  verified: true,
  created_at: '2024-01-01T00:00:00.000Z',
};

// Seed demo products
const INITIAL_DEMO_PRODUCTS: ProductWithManufacturer[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    manufacturer_id: DEMO_MANUFACTURER_ID,
    serial_code: 'ASL-2026-001',
    product_name: 'Tabiiy Tog\' Asali (500g)',
    category: 'Oziq-ovqat',
    batch_number: 'BATCH-14A',
    manufacture_date: '2026-10-15',
    expiry_date: '2028-10-15',
    ingredients: '100% tabiiy tog\' gullari nektari, konservantlarsiz',
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
    product_name: 'Qora Sedana Yog\'i (250ml)',
    category: 'Salomatlik',
    batch_number: 'BATCH-09B',
    manufacture_date: '2026-09-01',
    expiry_date: '2027-09-01',
    ingredients: 'Sovuq siqilgan tabiiy qora sedana yog\'i',
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
            is_claimed: Boolean(product.is_claimed),
            claimed_at: product.claimed_at || null,
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
    is_claimed: Boolean(existingProduct.is_claimed),
    claimed_at: existingProduct.claimed_at || null,
  };

  products[foundIndex] = updatedProduct;
  saveLocalProducts(products);

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
 * Claim ownership of a product ("Sotib oldim — Kodni o‘zimga band qilish")
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
        console.warn('Supabase claim update error (column may need SQL migration):', error.message);
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

/**
 * Fetch all products for the producer dashboard
 */
export async function fetchProducerProducts(): Promise<ProductWithManufacturer[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`*, manufacturers(*)`)
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
 * Fetch all counterfeit reports for the live radar
 */
export async function fetchReports(): Promise<ReportWithProduct[]> {
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
          products (
            id,
            serial_code,
            product_name
          )
        `)
        .eq('is_report', true)
        .order('scanned_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('Supabase fetch reports error, using local cache:', error.message);
      } else if (data) {
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
    } catch (err) {
      console.warn('Error fetching reports from Supabase:', err);
    }
  }

  // Local fallback reports
  const allLogs = getLocalLogs();
  const products = getLocalProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));

  const reports: ReportWithProduct[] = [];
  Object.values(allLogs).forEach((logList) => {
    logList.forEach((log) => {
      if (log.is_report) {
        const prod = productMap.get(log.product_id);
        reports.push({
          ...log,
          product: prod
            ? {
                id: prod.id,
                serial_code: prod.serial_code,
                product_name: prod.product_name,
              }
            : null,
        });
      }
    });
  });

  return reports.sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  );
}

/**
 * Delete a product from Supabase & local cache
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.warn('Supabase delete error:', error.message);
      }
    } catch (err) {
      console.warn('Error deleting from Supabase:', err);
    }
  }

  // Local cache delete
  const products = getLocalProducts();
  const filtered = products.filter((p) => p.id !== productId);
  saveLocalProducts(filtered);

  return true;
}

/**
 * Create a single or batch of products in the registry
 */
export async function createBatchProducts(
  payload: NewProductPayload,
  count: number = 1
): Promise<ProductWithManufacturer[]> {
  const safeCount = Math.max(1, Math.min(20, count));
  const baseSerialPrefix = `ASL-2026-`;
  const startNum = Math.floor(100 + Math.random() * 800);

  const newProducts: ProductWithManufacturer[] = [];

  for (let i = 0; i < safeCount; i++) {
    const code =
      safeCount === 1 && payload.serial_code?.trim()
        ? payload.serial_code.trim().toUpperCase()
        : `${baseSerialPrefix}${startNum + i}`;

    const prod: ProductWithManufacturer = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}-${i}`,
      manufacturer_id: DEMO_MANUFACTURER_ID,
      serial_code: code,
      product_name: payload.product_name.trim(),
      category: payload.category || 'Boshqa',
      batch_number: payload.batch_number.trim() || `BATCH-2026-X1`,
      manufacture_date: payload.manufacture_date,
      expiry_date: payload.expiry_date,
      ingredients: payload.ingredients?.trim() || null,
      scan_count: 0,
      max_safe_scans: payload.max_safe_scans || 3,
      is_flagged: false,
      is_claimed: false,
      claimed_at: null,
      created_at: new Date().toISOString(),
      manufacturers: DEMO_MANUFACTURER,
    };
    newProducts.push(prod);
  }

  if (isSupabaseConfigured) {
    try {
      const rowsToInsert = newProducts.map((p) => ({
        manufacturer_id: DEMO_MANUFACTURER_ID,
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

export async function createProduct(payload: NewProductPayload): Promise<ProductWithManufacturer> {
  const result = await createBatchProducts(payload, 1);
  return result[0];
}
