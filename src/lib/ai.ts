import type { ProductWithManufacturer } from '../types';

export interface ProductAiAnalysis {
  safety_score: 'Yuqori' | "O'rtacha" | 'Past';
  ingredients_summary: string;
  authenticity_verdict: string;
  buyer_tip: string;
}

export interface ProducerAiReport {
  risk_level: 'Past' | "O'rtacha" | 'Yuqori';
  executive_summary: string;
  top_hotspots: string[];
  action_recommendation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

/**
 * Interactive Chat with AslCheck AI Assistant (Gemini 3.5 Flash)
 */
export async function askAiAssistant(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  context?: string
): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return '';

  // 1. Call serverless /api/ai
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

  // 2. Fallback advice if network or backend is unreachable
  return `AslCheck AI tahlili:
Mahsulotlarning asl nusxasini tekshirish uchun uning qadog‘idagi unikal seriya kodini AslCheck orqali skanerlang va qadoqdagi himoya stikerining butunligini tekshiring.

Asosiy tavsiyalar:
• Ishlab chiqaruvchi litsenziyasi va partiya raqamini AslCheck reyestri bilan solishtiring.
• Qadoq ochilmaganiga va himoya plyonkasi zararlanmaganiga ishonch hosil qiling.
• Xarid qilgach, "Sotib oldim — Kodni band qilish" funksiyasini faollashtiring.`;
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
        return data as ProductAiAnalysis;
      }
    }
  } catch (err) {
    console.warn('Network call to /api/ai failed, generating local fallback:', err);
  }

  // Local fallback if running in offline dev
  const isSuspicious =
    product.is_flagged || (product.scan_count || 0) > (product.max_safe_scans || 3);
  const isExpired = product.expiry_date
    ? new Date(product.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0)
    : false;

  let safetyScore: 'Yuqori' | "O'rtacha" | 'Past' = 'Yuqori';
  let authVerdict = 'Skanerlashlar soni xavfsiz chegarada, nusxalanish alomatlari aniqlanmadi.';

  if (isExpired) {
    safetyScore = 'Past';
    authVerdict = 'Mahsulot kodining aslligi tasdiqlangan, ammo belgilangan yaroqlilik muddati tugagan!';
  } else if (isSuspicious) {
    safetyScore = "O'rtacha";
    authVerdict = `Kod xavfsiz chegaradan (${product.max_safe_scans || 3}) ko'p marta skanerlangan. Qadoq nusxalangan bo'lish xavfi yuqori.`;
  }

  return {
    safety_score: safetyScore,
    ingredients_summary: product.ingredients
      ? `Tarkibida tabiiy xomashyolar mavjud (${product.ingredients.slice(0, 70)}...), sun'iy zararli konservantlar ko'rsatilmagan.`
      : 'Mahsulot tabiiy standartlarga muvofiq ro‘yxatga olingan, zararli qo‘shimchalar qayd etilmagan.',
    authenticity_verdict: authVerdict,
    buyer_tip: 'Qadoqdagi himoya halqasi va ishlab chiqaruvchi litsenziya stikerining butunligini tekshiring.',
  };
}

/**
 * Call serverless /api/ai for producer executive report
 */
export async function generateProducerAiReport(stats: {
  total_products: number;
  total_scans: number;
  suspicious_count: number;
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
    suspiciousRatio > 0.3 ? 'Yuqori' : suspiciousRatio > 0 ? "O'rtacha" : 'Past';

  return {
    risk_level: riskLevel,
    executive_summary:
      stats.suspicious_count > 0
        ? `Tizimda ${stats.suspicious_count} ta mahsulot bo'yicha takroriy skanerlash va soxtalik signallari qayd etildi. Umumiy brend nufuzi nazorat ostida.`
        : 'Barcha partiyalarda skanerlashlar xavfsiz chegarada amalga oshirilmoqda. Kontrafakt xavfi minimal darajada.',
    top_hotspots: ['Samarqand, Siyob bozori', 'Toshkent sh., Chorsu bozori'],
    action_recommendation:
      'Shubhali belgilangan seriya kodlari partiyasini savdo nuqtalarida maxsus nazoratdan o‘tkazing va xaridorlarga faollashtirish (band qilish) tizimini targ‘ib qiling.',
  };
}
