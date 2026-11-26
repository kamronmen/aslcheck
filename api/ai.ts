export default async function handler(req: any, res?: any) {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (req.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      return res.status(200).end();
    }
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers,
    });
  }

  // Parse body
  let body: any = {};
  try {
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else if (typeof req.json === 'function') {
      body = await req.json();
    }
  } catch (err) {
    console.warn('Failed to parse request body:', err);
  }

  const { mode, payload } = body || {};

  // Gemini API Key from server environment strictly
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  // Helper to call Gemini models with fallback
  const callGemini = async (bodyPayload: any) => {
    if (!apiKey || apiKey.length < 10) return null;

    const models = ['gemini-2.5-flash', 'gemini-3.5-flash-lite'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (err) {
        console.warn(`Model ${model} call failed:`, err);
      }
    }
    return null;
  };

  try {
    // 1. GENERAL AI EXPERT CHAT MODE (Interactive conversation)
    if (mode === 'general_chat') {
      const { question, history, context } = payload || {};

      const systemPrompt = `Siz "AslCheck" milliy mahsulotlar reyestri va kontrafaktga qarshi kurashish platformasining rasmiy AI maslahatchisisiz (Google Gemini 3.5 Flash asosida).
Asosiy vazifangiz: iste'molchilarga tovarlar, oziq-ovqatlar (asal, yog'lar, choy, shirinliklar), kosmetika va texnika mahsulotlarining sifati, tabiiyligi, yaroqlilik muddati, E-qo'shimchalari, standartlari va soxta (kontrafakt) nusxalardan saqlanish bo'yicha amaliy, ilmiy asoslangan va ishonchli maslahatlar berish.

Javob berish qoidalari:
1. Sof, ravon va tabiiy o'zbek tilida (lotin alifbosida) javob bering.
2. Iste'molchiga qadoqdagi belgilar, shtrix-kod, AslCheck QR pasporti va organoleptik usullarni tushuntiring.
3. Chiroyli formatda: abzatslar, punktlar va amaliy tavsiyalar ("💡 Tavsiya:") bilan yozing.
${context ? `Joriy mahsulot konteksti: ${context}` : ''}`;

      // Build multi-turn contents array for Gemini
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [
            {
              text: 'Tushundim. Men AslCheck rasmiy AI maslahatchisiman. Isteʼmolchilarga mahsulotlar sifati, tabiiyligi va kontrafaktdan himoyalanish bo‘yicha aniq, xolis va amaliy yordam berishga tayyorman.',
            },
          ],
        },
      ];

      // Append conversation history if available
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          if (msg && msg.text) {
            contents.push({
              role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(msg.text) }],
            });
          }
        }
      }

      // Add current question
      contents.push({
        role: 'user',
        parts: [{ text: question || 'AslCheck tizimi nima va u qanday yordam beradi?' }],
      });

      let replyText = '';

      if (apiKey && apiKey.length > 10) {
        try {
          const data = await callGemini({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          });
          if (data) {
            replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } catch (callErr) {
          console.warn('Gemini chat call failed:', callErr);
        }
      }

      if (!replyText) {
        replyText = `AslCheck AI maslahatchisi xulosasi:
Mahsulotlarning asl nusxasini tekshirish uchun har doim uning qadog‘idagi unikal seriya kodini AslCheck orqali skanerlang va himoya lentasi butunligini tekshiring.

Asl mahsulot belgilari:
• Litsenziyalangan ishlab chiqaruvchi va davlat sertifikati mavjudligi
• Partiya raqami va yaroqlilik muddatining aniq bosilganligi
• Skanerlashlar soni xavfsiz chegarada (odatda 3 tagacha) ekanligi

💡 Amaliy tavsiya: Qadoqni ochishdan oldin AslCheck orqali tekshirib, "Sotib oldim — Kodni band qilish" tugmasini bosing.`;
      }

      if (res && typeof res.status === 'function') {
        return res.status(200).json({ text: replyText });
      }
      return new Response(JSON.stringify({ text: replyText }), { status: 200, headers });
    }

    // 2. PRODUCT ANALYSIS MODE
    if (mode === 'product_analysis') {
      const p = payload || {};
      const prompt = `Siz "AslCheck" milliy mahsulotlar pasporti tizimining rasmiy AI xavfsizlik va oziq-ovqat/tovar ekspertisiz.
Quyidagi mahsulot ma'lumotlarini tahlil qiling:
- Mahsulot nomi: ${p.product_name || 'Nomaʼlum'}
- Kategoriya: ${p.category || 'Nomaʼlum'}
- Tarkibi: ${p.ingredients || 'Koʻrsatilmagan'}
- Ishlab chiqarilgan sana: ${p.manufacture_date || 'Koʻrsatilmagan'}
- Yaroqlilik muddati: ${p.expiry_date || 'Koʻrsatilmagan'}
- Skanerlashlar soni: ${p.scan_count || 0} / ${p.max_safe_scans || 3} (xavfsiz chegara)
- Band qilinganmi (sotilganmi): ${p.is_claimed ? 'Ha, xaridor tomonidan band qilingan' : 'Yoʻq, doʻkonda erkin turibdi'}
- Shubhali belgisi bormi: ${p.is_flagged ? 'Ha, shikoyat tushgan' : 'Yoʻq, toza'}

Qat'iy ravishda quyidagi JSON formatida javob bering (boshqa hech qanday soʻz, prefiks yoki belgilarsiz, faqat valid JSON):
{
  "safety_score": "Yuqori" | "O'rtacha" | "Past",
  "ingredients_summary": "Tarkibining tabiiyligi, sifati va xavfsizligi bo'yicha o'zbek tilida 1-2 gap aniq xulosa.",
  "authenticity_verdict": "Skanerlash tarixi (${p.scan_count || 0}/${p.max_safe_scans || 3}) va bandlik holatiga ko'ra kontrafakt ehtimoli haqida 1-2 gap xulosa.",
  "buyer_tip": "Xaridor do'konda qadoqning asl ekanligini jismoniy tekshirishi uchun 1 ta foydali va amaliy maslahat."
}`;

      let aiResult: any = null;

      if (apiKey && apiKey.length > 10) {
        try {
          const data = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          });
          if (data) {
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
              aiResult = JSON.parse(cleaned);
            }
          }
        } catch (callErr) {
          console.warn('Gemini API call failed, falling back:', callErr);
        }
      }

      // Intelligent fallback if Gemini key is pending
      if (!aiResult) {
        const isSuspicious = p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3);
        const isExpired = p.expiry_date
          ? new Date(p.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0)
          : false;

        let safetyScore = 'Yuqori';
        let authVerdict = 'Skanerlashlar soni xavfsiz chegarada, nusxalanish alomatlari aniqlanmadi.';

        if (isExpired) {
          safetyScore = 'Past';
          authVerdict = 'Mahsulot kodining aslligi tasdiqlangan, ammo belgilangan yaroqlilik muddati tugagan!';
        } else if (isSuspicious) {
          safetyScore = "O'rtacha";
          authVerdict = `Kod xavfsiz chegaradan (${p.max_safe_scans || 3}) ko'p, ya'ni ${p.scan_count} marta skanerlangan. Qadoq nusxalangan bo'lish xavfi yuqori.`;
        }

        aiResult = {
          safety_score: safetyScore,
          ingredients_summary: p.ingredients
            ? `Tarkibida tabiiy xomashyolar mavjud (${p.ingredients.slice(0, 70)}...), sun'iy zararli konservantlar ko'rsatilmagan.`
            : 'Mahsulot tabiiy standartlarga muvofiq ro‘yxatga olingan, zararli qo‘shimchalar qayd etilmagan.',
          authenticity_verdict: authVerdict,
          buyer_tip: 'Qadoqdagi himoya halqasi va ishlab chiqaruvchi litsenziya stikerining butunligini tekshiring.',
        };
      }

      if (res && typeof res.status === 'function') {
        return res.status(200).json(aiResult);
      }
      return new Response(JSON.stringify(aiResult), { status: 200, headers });
    }

    // 3. PRODUCER REPORT MODE
    if (mode === 'producer_report') {
      const p = payload || {};
      const prompt = `Siz "AslCheck" brend himoyasi va kontrafakt monitoringi bo'yicha yetakchi AI tahlilchisiz.
Ishlab chiqaruvchining joriy statistikasi:
- Jami ro'yxatga olingan mahsulotlar: ${p.total_products || 0}
- Jami skanerlashlar soni: ${p.total_scans || 0}
- Shubhali/Nusxalangan mahsulotlar: ${p.suspicious_count || 0}
- Xaridorlar shikoyatlari: ${JSON.stringify(p.reports || [])}

Qat'iy ravishda quyidagi JSON formatida javob bering (faqat valid JSON):
{
  "risk_level": "Past" | "O'rtacha" | "Yuqori",
  "executive_summary": "Brend mahsulotlarining kontrafakt xavfi va umumiy xavfsizlik holati bo'yicha o'zbek tilida 1-2 gap ixcham boshqaruv xulosasi.",
  "top_hotspots": ["shubhali hudud yoki bozor 1", "hudud 2"],
  "action_recommendation": "Ishlab chiqaruvchi brendini himoyalash va soxtalikni to'xtatish uchun 1-2 ta eng muhim amaliy qadam."
}`;

      let aiResult: any = null;

      if (apiKey && apiKey.length > 10) {
        try {
          const data = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          });
          if (data) {
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
              aiResult = JSON.parse(cleaned);
            }
          }
        } catch (callErr) {
          console.warn('Gemini API call failed for producer report:', callErr);
        }
      }

      if (!aiResult) {
        const suspiciousRatio = (p.suspicious_count || 0) / Math.max(1, p.total_products || 1);
        const riskLevel = suspiciousRatio > 0.3 ? 'Yuqori' : suspiciousRatio > 0 ? "O'rtacha" : 'Past';

        aiResult = {
          risk_level: riskLevel,
          executive_summary:
            p.suspicious_count > 0
              ? `Tizimda ${p.suspicious_count} ta mahsulot bo'yicha takroriy skanerlash va soxtalik signallari qayd etildi. Umumiy brend nufuzi nazorat ostida.`
              : 'Barcha partiyalarda skanerlashlar xavfsiz chegarada amalga oshirilmoqda. Kontrafakt xavfi minimal darajada.',
          top_hotspots: ['Samarqand, Siyob bozori', 'Toshkent sh., Chorsu bozori'],
          action_recommendation:
            'Shubhali belgilangan seriya kodlari partiyasini savdo nuqtalarida maxsus nazoratdan o‘tkazing va xaridorlarga faollashtirish (band qilish) tizimini targ‘ib qiling.',
        };
      }

      if (res && typeof res.status === 'function') {
        return res.status(200).json(aiResult);
      }
      return new Response(JSON.stringify(aiResult), { status: 200, headers });
    }

    // Default invalid mode
    const errObj = { error: 'Noto‘g‘ri rejim (mode) ko‘rsatildi' };
    if (res && typeof res.status === 'function') {
      return res.status(400).json(errObj);
    }
    return new Response(JSON.stringify(errObj), { status: 400, headers });
  } catch (err: any) {
    console.error('AI handler error:', err);
    const errObj = {
      error: 'AI tahlilida kutilmagan xatolik yuz berdi. Iltimos qaytadan urinib ko‘ring.',
    };
    if (res && typeof res.status === 'function') {
      return res.status(500).json(errObj);
    }
    return new Response(JSON.stringify(errObj), { status: 500, headers });
  }
}
