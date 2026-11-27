import type { ProductWithManufacturer, VisionVerifyResult } from '../types';

export interface ProductAiAnalysis {
  safety_score: 'Yuqori' | "O'rtacha" | 'Past';
  trust_score: number;
  days_until_expiry?: number | null;
  ingredients_summary: string;
  ingredient_tags: string[];
  authenticity_verdict: string;
  buyer_tip: string;
  physical_checks: string[];
}

export interface ProducerAiReport {
  risk_level: 'Past' | "O'rtacha" | 'Yuqori';
  executive_summary: string;
  risky_serial_codes?: string[];
  top_hotspots: string[];
  action_recommendation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isVoice?: boolean;
  durationSec?: number;
}

export interface VoiceChatResponse {
  transcript: string;
  reply: string;
}

export interface SmartFillProductItem {
  product_name: string;
  category: string;
  batch_number: string;
  quantity: number;
  max_safe_scans: number;
  manufacture_date: string;
  expiry_date: string;
  ingredients: string;
}

/**
 * Hybrid Vision Forensics verification via /api/ai (vision_verify)
 */
export async function verifyImageWithVision(params: {
  imageBase64: string;
  mimeType: string;
  decodedCode: string | null;
  expectedProduct: ProductWithManufacturer | null;
}): Promise<VisionVerifyResult> {
  const { imageBase64, mimeType, decodedCode, expectedProduct } = params;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'vision_verify',
        payload: {
          imageBase64,
          mimeType,
          decodedCode,
          expectedProduct: expectedProduct
            ? {
                serial_code: expectedProduct.serial_code,
                product_name: expectedProduct.product_name,
                category: expectedProduct.category,
                batch_number: expectedProduct.batch_number,
                manufacturers: expectedProduct.manufacturers
                  ? {
                      name: expectedProduct.manufacturers.name,
                      region: expectedProduct.manufacturers.region,
                      license_number: expectedProduct.manufacturers.license_number,
                    }
                  : null,
              }
            : null,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.forensic_verdict) {
        return data as VisionVerifyResult;
      }
    }
  } catch (err) {
    console.warn('Vision verify call to /api/ai failed:', err);
  }

  // Fallback if backend is unreachable
  return {
    detected_code: decodedCode,
    confidence_score: decodedCode ? 72 : 35,
    package_match: "Qisman / Aniqlab bo'lmadi",
    print_quality: decodedCode ? "O'rtacha sifat" : 'Shubhali (Kserokopiya / Xira)',
    forensic_verdict: decodedCode
      ? `QR kod (${decodedCode}) dekoder orqali o‘qildi, biroq server bilan vizual taqqoslash vaqtincha mavjud emas. Qadoqdagi mahsulot nomini pastdagi pasport bilan solishtiring.`
      : 'Tasvirdan QR-kod yoki seriya raqami aniqlanmadi. Yorug‘roq va fokusli surat yuklang.',
    forensic_checks: [
      {
        label: 'QR bosma aniqligi',
        status: decodedCode ? 'pass' : 'warn',
        detail: decodedCode
          ? 'Matritsa raqamli dekoder orqali muvaffaqiyatli o‘qildi.'
          : 'Tasvirda o‘qiladigan QR matritsa topilmadi.',
      },
      {
        label: 'Qadoq va pasport mosligi',
        status: 'warn',
        detail: expectedProduct
          ? `Pasportdagi tovar: ${expectedProduct.product_name}. Qo‘lda tekshiring.`
          : 'Pasport maʼlumoti topilmadi.',
      },
      {
        label: 'Soxtalashtirish belgilari',
        status: decodedCode ? 'pass' : 'warn',
        detail: 'Qadoq muhri va himoya yorlig‘ining butunligini ko‘zdan kechiring.',
      },
    ],
  };
}

/**
 * Interactive Chat with AslCheck AI Assistant
 */
export async function askAiAssistant(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  context?: string
): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return '';

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'general_chat',
        payload: {
          question: trimmed,
          history,
          context,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.text) {
        return data.text;
      }
    }
  } catch (err) {
    console.warn('Call to /api/ai failed, using local guidance fallback:', err);
  }

  return `AslCheck Yordamchi tahlili:
Mahsulotlarning asl nusxasini tekshirish uchun uning qadog‘idagi unikal seriya kodini AslCheck orqali skanerlang va qadoqdagi himoya stikerining butunligini tekshiring.

Asosiy tavsiyalar:
• Ishlab chiqaruvchi litsenziyasi va partiya raqamini AslCheck reyestri bilan solishtiring.
• Qadoq ochilmaganiga va himoya plyonkasi zararlanmaganiga ishonch hosil qiling.
• Xarid qilgach, "Sotib oldim — Kodni band qilish" funksiyasini faollashtiring.`;
}

/**
 * Interactive Voice Chat with AslCheck AI Assistant (/api/ai mode: voice_chat)
 */
export async function askAiWithVoice(params: {
  audioBase64: string;
  mimeType: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  context?: string;
}): Promise<VoiceChatResponse> {
  const { audioBase64, mimeType, history = [], context } = params;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'voice_chat',
        payload: {
          audioBase64,
          mimeType,
          history,
          context,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.reply === 'string' && data.reply.trim()) {
        return {
          transcript: typeof data.transcript === 'string' ? data.transcript.trim() : '',
          reply: data.reply.trim(),
        };
      }
    }
  } catch (err) {
    console.warn('Voice chat call to /api/ai failed:', err);
  }

  return {
    transcript: '',
    reply:
      "Kechirasiz, ovozli xabarni qayta ishlashda vaqtinchalik uzilish yuz berdi. Iltimos, qaytadan urinib ko'ring.",
  };
}

/**
 * Extract 1 or more structured product drafts from natural text or a label photo via /api/ai
 */
export async function extractProductsWithAi(params: {
  promptText?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<SmartFillProductItem[]> {
  const { promptText = '', imageBase64, mimeType } = params;
  const trimmed = promptText.trim();
  if (!trimmed && !imageBase64) return [];

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'smart_fill_product',
        payload: {
          promptText: trimmed,
          imageBase64,
          mimeType,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.items) && data.items.length > 0) {
        return data.items as SmartFillProductItem[];
      }
    }
  } catch (err) {
    console.warn('Smart fill call to /api/ai failed, using local fallback:', err);
  }

  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);
  const qtyMatch = trimmed.match(/(\d+)\s*(?:ta|dona|sht|pcs)/i);

  return [
    {
      product_name: trimmed ? trimmed.split(',')[0].trim() : 'Yangi mahsulot',
      category: 'Oziq-ovqat',
      batch_number: `BATCH-${today.getFullYear()}-01`,
      quantity: qtyMatch ? Math.max(1, Math.min(100, Number(qtyMatch[1]))) : 1,
      max_safe_scans: 3,
      manufacture_date: today.toISOString().split('T')[0],
      expiry_date: nextYear.toISOString().split('T')[0],
      ingredients: trimmed,
    },
  ];
}

/**
 * Call serverless /api/ai for consumer product analysis
 */
export async function analyzeProductWithAi(
  product: ProductWithManufacturer
): Promise<ProductAiAnalysis> {
  const payload = {
    product_name: product.product_name,
    category: product.category,
    ingredients: product.ingredients,
    manufacture_date: product.manufacture_date,
    expiry_date: product.expiry_date,
    scan_count: product.scan_count,
    max_safe_scans: product.max_safe_scans,
    is_claimed: product.is_claimed,
    is_flagged: product.is_flagged,
  };

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'product_analysis',
        payload,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.safety_score) {
        return {
          ...data,
          trust_score: typeof data.trust_score === 'number' ? data.trust_score : 85,
          ingredient_tags: Array.isArray(data.ingredient_tags) ? data.ingredient_tags : [],
          physical_checks: Array.isArray(data.physical_checks) ? data.physical_checks : [],
        } as ProductAiAnalysis;
      }
    }
  } catch (err) {
    console.warn('Network call to /api/ai failed, generating local fallback:', err);
  }

  let daysUntilExpiry: number | null = null;
  if (product.expiry_date) {
    const target = new Date(product.expiry_date);
    if (!Number.isNaN(target.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      daysUntilExpiry = Math.round((target.getTime() - today.getTime()) / 86400000);
    }
  }

  const isSuspicious =
    product.is_flagged || (product.scan_count || 0) > (product.max_safe_scans || 3);
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  let safetyScore: 'Yuqori' | "O'rtacha" | 'Past' = 'Yuqori';
  let trustScore = 92;
  let authVerdict = `Kod (${product.scan_count}/${product.max_safe_scans}) xavfsiz chegarada tekshirilgan, nusxalanish alomatlari aniqlanmadi.`;

  if (isExpired) {
    safetyScore = 'Past';
    trustScore = 25;
    authVerdict = `Mahsulot kodi asl, ammo yaroqlilik muddati ${Math.abs(daysUntilExpiry!)} kun oldin tugagan.`;
  } else if (isSuspicious) {
    safetyScore = "O'rtacha";
    trustScore = 38;
    authVerdict = `Kod xavfsiz chegaradan (${product.max_safe_scans || 3}) ko‘p marta skanerlangan. Qadoq nusxalangan bo‘lish xavfi yuqori.`;
  } else if (product.is_claimed) {
    safetyScore = "O'rtacha";
    trustScore = 58;
    authVerdict = 'Mahsulot avval boshqa xaridor tomonidan band qilingan.';
  }

  return {
    safety_score: safetyScore,
    trust_score: trustScore,
    days_until_expiry: daysUntilExpiry,
    ingredients_summary: product.ingredients
      ? `Tarkib: ${product.ingredients}. ${
          daysUntilExpiry !== null
            ? daysUntilExpiry >= 0
              ? `Yaroqlilik muddatigacha ${daysUntilExpiry} kun qoldi.`
              : `Muddati ${Math.abs(daysUntilExpiry)} kun o‘tgan.`
            : ''
        }`
      : 'Mahsulot tarkibi pasportda batafsil keltirilmagan.',
    ingredient_tags: product.ingredients
      ? ['Pasportda ko‘rsatilgan', isExpired ? 'Muddati o‘tgan' : 'Tekshirilgan']
      : ['Tarkib ko‘rsatilmagan'],
    authenticity_verdict: authVerdict,
    buyer_tip: 'Qadoqdagi himoya halqasi va ishlab chiqaruvchi litsenziya stikerining butunligini tekshiring.',
    physical_checks: [
      'Qopqoq ostidagi himoya muhri buzilmaganligini tekshiring',
      `Partiya sanasi (${product.manufacture_date}) bilan qadoqdagi bosmani solishtiring`,
      'QR yorliqda kserokopiya yoki qayta yopishtirish izlari yo‘qligiga ishonch hosil qiling',
    ],
  };
}

/**
 * Call serverless /api/ai for strict multi-tenant producer executive report
 */
export async function generateProducerAiReport(stats: {
  company_name: string;
  region: string;
  license_number: string;
  total_products: number;
  total_scans: number;
  suspicious_count: number;
  products_summary: Array<{
    serial_code: string;
    product_name: string;
    scan_count: number;
    max_safe_scans: number;
    is_flagged: boolean;
  }>;
  reports: any[];
}): Promise<ProducerAiReport> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'producer_report',
        payload: stats,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.risk_level) {
        return data as ProducerAiReport;
      }
    }
  } catch (err) {
    console.warn('Network call to /api/ai failed for producer report:', err);
  }

  const suspiciousRatio = stats.suspicious_count / Math.max(1, stats.total_products);
  const riskLevel: 'Past' | "O'rtacha" | 'Yuqori' =
    suspiciousRatio > 0.25 ? 'Yuqori' : suspiciousRatio > 0 || stats.reports.length > 0 ? "O'rtacha" : 'Past';

  const riskyCodes = stats.products_summary
    .filter((item) => item.is_flagged || item.scan_count > item.max_safe_scans)
    .map((item) => item.serial_code)
    .slice(0, 5);

  const reportLocations = Array.from(
    new Set(
      stats.reports
        .map((r) => r.location_note)
        .filter((loc): loc is string => typeof loc === 'string' && loc.trim().length > 0)
    )
  ).slice(0, 4);

  return {
    risk_level: riskLevel,
    executive_summary:
      stats.suspicious_count > 0 || stats.reports.length > 0
        ? `${stats.company_name} bo‘yicha ${stats.suspicious_count} ta shubhali mahsulot va ${stats.reports.length} ta shikoyat aniqlandi.`
        : `${stats.company_name} bo‘yicha barcha partiyalarda skanerlashlar xavfsiz chegarada amalga oshirilmoqda.`,
    risky_serial_codes: riskyCodes,
    top_hotspots: reportLocations.length > 0 ? reportLocations : ['Shubhali hududlar aniqlanmadi'],
    action_recommendation:
      riskyCodes.length > 0
        ? `Shubhali belgilangan seriya kodlari (${riskyCodes.join(', ')}) bo‘yicha savdo nuqtalarida tekshiruv o‘tkazing.`
        : 'Mijozlarga xarid paytida QR kodni band qilish funksiyasidan foydalanishni targ‘ib qiling.',
  };
}
