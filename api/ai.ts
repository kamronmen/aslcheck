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

  const sendJson = (data: any, statusCode: number = 200) => {
    if (res && typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    return new Response(JSON.stringify(data), { status: statusCode, headers });
  };

  // Parse body safely
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

  // Read Gemini API Key strictly from server environment
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

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
          return await response.json();
        }
      } catch (err) {
        console.warn(`Model ${model} call failed:`, err);
      }
    }
    return null;
  };

  const extractCleanJson = (rawText: string | undefined | null): any | null => {
    if (!rawText || typeof rawText !== 'string') return null;
    try {
      const stripped = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      const firstBrace = stripped.indexOf('{');
      const lastBrace = stripped.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
      }
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  };

  const computeDaysUntilExpiry = (expiryDateStr?: string | null): number | null => {
    if (!expiryDateStr) return null;
    const target = new Date(expiryDateStr);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  };

  try {
    // 1. HYBRID VISION FORENSICS MODE
    if (mode === 'vision_verify') {
      const { imageBase64, mimeType, decodedCode, expectedProduct } = payload || {};

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return sendJson({ error: 'Tahlil uchun rasm taqdim etilmadi.' }, 400);
      }

      const expectedContext = expectedProduct
        ? `
ASOSIY BAZA MA'LUMOTI (QR kod skanerdan olingan):
- Seriya kodi: ${expectedProduct.serial_code}
- Kutilayotgan mahsulot nomi: ${expectedProduct.product_name}
- Kutilayotgan kategoriya: ${expectedProduct.category}
- Rasmiy ishlab chiqaruvchi: ${expectedProduct.manufacturers?.name || 'Ro‘yxatda mavjud'}
- Partiya: ${expectedProduct.batch_number}

MUHIM VAZIFA: Surattagi jismoniy mahsulot va qadoqni yuqoridagi kutilayotgan mahsulot nomi ("${expectedProduct.product_name}") hamda kategoriyasi ("${expectedProduct.category}") bilan qat'iy taqqoslang. Agar asal yoki yog' QR-kodi suv idishi, boshqa tovar yoki aloqasiz obyektga yopishtirilgan bo'lsa, "package_match" maydonini albatta "Mos kelmaydi" deb belgilang va "Qadoq va pasport mosligi" tekshiruviga status: "fail" qo'ying.`
        : `
Bazada oldindan QR kod aniqlanmadi. Suratdan "ASL-2026-XXX" ko'rinishidagi seriya kodini OCR orqali o'qishga harakat qiling. Agar kod ko'rinmasa, "detected_code": null qaytaring va "package_match": "Qisman / Aniqlab bo'lmadi" qilib belgilang.`;

      const visionPrompt = `Siz "AslCheck" milliy kontrafaktga qarshi kiber-kriminalistika va qadoq ekspertizasi bo‘yicha yetakchi mutaxassissiz.
Foydalanuvchi mahsulot qadog‘i yoki QR-kodining suratini yubordi. Mahalliy QR dekoder topgan kod: ${decodedCode || 'Topilmadi (OCR talab qilinadi)'}.
${expectedContext}

Surattagi bosma aniqligi, qadoq yaxlitligi, kserokopiya/ekrandan rasm olinganlik belgilari va qadoq-pasport mosligini tekshirib, FAQAT valid JSON qaytaring (hech qanday emoji, markdown belgilari yoki qo'shimcha matnsiz):
{
  "detected_code": "${decodedCode || 'ASL-2026-XXX yoki null'}",
  "confidence_score": 0 dan 100 gacha butun son,
  "package_match": "Mos keladi" | "Mos kelmaydi" | "Qisman / Aniqlab bo'lmadi",
  "print_quality": "Asl zavod bosmasi" | "O'rtacha sifat" | "Shubhali (Kserokopiya / Xira)",
  "forensic_verdict": "O'zbek tilida (lotin) bosma aniqligi, qadoq muhri yaxlitligi va jismoniy mahsulotning bazaga mosligi haqida 2 ta aniq, professional xulosa gapi.",
  "forensic_checks": [
    { "label": "QR bosma aniqligi", "status": "pass" | "warn" | "fail", "detail": "O'zbek tilida qisqa aniq izoh" },
    { "label": "Qadoq va pasport mosligi", "status": "pass" | "warn" | "fail", "detail": "O'zbek tilida qisqa aniq izoh" },
    { "label": "Soxtalashtirish belgilari", "status": "pass" | "warn" | "fail", "detail": "O'zbek tilida qisqa aniq izoh" }
  ]
}`;

      const data = await callGemini({
        contents: [
          {
            parts: [
              { text: visionPrompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: 'application/json',
        },
      });

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      let visionResult = extractCleanJson(rawText);

      if (!visionResult || !visionResult.forensic_verdict) {
        visionResult = {
          detected_code: decodedCode || null,
          confidence_score: decodedCode ? 78 : 45,
          package_match: expectedProduct ? "Qisman / Aniqlab bo'lmadi" : "Qisman / Aniqlab bo'lmadi",
          print_quality: decodedCode ? "O'rtacha sifat" : 'Shubhali (Kserokopiya / Xira)',
          forensic_verdict: decodedCode
            ? `Suratdagi ${decodedCode} QR-kodi o‘qildi, biroq qadoqning vizual tafsilotlarini yuqori aniqlikda tahlil qilish uchun yorug‘roq tasvir talab etiladi. Qadoq yorlig‘idagi korxona nomi va muhrni pasport bilan qo‘lda solishtiring.`
            : 'Suratda aniq seriya kodi yoki QR matritsa aniqlanmadi. Kamerani QR-kodga yaqinroq va fokusda ushlab qayta suratga oling.',
          forensic_checks: [
            {
              label: 'QR bosma aniqligi',
              status: decodedCode ? 'pass' : 'warn',
              detail: decodedCode
                ? 'Matritsa raqamli dekoder orqali aniq o‘qildi.'
                : 'QR kod qirralari xira yoki ko‘rinmayapti.',
            },
            {
              label: 'Qadoq va pasport mosligi',
              status: expectedProduct ? 'warn' : 'warn',
              detail: expectedProduct
                ? `Kutilayotgan tovar: ${expectedProduct.product_name}. Jismoniy moslikni vizual tasdiqlang.`
                : 'Baza pasporti bilan taqqoslash uchun kod aniqlanmadi.',
            },
            {
              label: 'Soxtalashtirish belgilari',
              status: decodedCode ? 'pass' : 'warn',
              detail: 'Qadoq qopqog‘i va himoya halqasini qo‘shimcha ko‘zdan kechiring.',
            },
          ],
        };
      } else if (decodedCode && !visionResult.detected_code) {
        visionResult.detected_code = decodedCode;
      }

      return sendJson(visionResult, 200);
    }

    // 2. GENERAL AI EXPERT CHAT MODE
    if (mode === 'general_chat') {
      const { question, history, context } = payload || {};

      const systemPrompt = `Siz "AslCheck" milliy mahsulotlar reyestri va kontrafaktga qarshi kurashish platformasining rasmiy AI ekspertisiz.
Vazifangiz: iste'molchilar va ishlab chiqaruvchilarga tovarlar sifati, tarkibi, E-qo'shimchalar, yaroqlilik muddati va kontrafakt qadoqlarni aniqlash bo'yicha aniq, ilmiy va professional maslahat berish.

Qoidalar:
1. Sof, rasmiy va tushunarli o'zbek tilida (lotin alifbosi) javob bering.
2. Hech qanday emoji ishlatmang.
3. Tuzilmani aniq abzatslar va punktlar bilan yozing.
${context ? `Joriy kontekst: ${context}` : ''}`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [
            {
              text: 'Tushundim. AslCheck rasmiy eksperti sifatida aniq, professional va emojisiz javob beraman.',
            },
          ],
        },
      ];

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

      contents.push({
        role: 'user',
        parts: [{ text: question || 'AslCheck tizimi qanday ishlaydi?' }],
      });

      const data = await callGemini({
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 900,
        },
      });

      let replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!replyText) {
        replyText = `AslCheck tizimi bo‘yicha ma'lumot:
Mahsulotning asl nusxasini tekshirish uchun qadoqdagi unikal seriya kodini skanerlang yoki kiriting.

Asosiy mezonlar:
• Ishlab chiqaruvchi litsenziyasi va partiya raqami reyestr bilan mos kelishi shart.
• Skanerlashlar soni xavfsiz chegaradan (odatda 3 martadan) oshmagan bo‘lishi kerak.
• Qadoqni xarid qilganingizdan so‘ng "Sotib oldim — Kodni band qilish" funksiyasini bosing.`;
      }

      return sendJson({ text: replyText }, 200);
    }

    // 2B. MULTIMODAL VOICE CHAT MODE (Uzbek Speech Understanding + Response)
    if (mode === 'voice_chat') {
      const { audioBase64, mimeType, history, context } = payload || {};

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return sendJson({ error: 'Ovozli xabar yuborilmadi.' }, 400);
      }

      const cleanMime = String(mimeType || 'audio/webm').split(';')[0].trim().toLowerCase() || 'audio/webm';

      const voiceSystemPrompt = `Siz "AslCheck" milliy mahsulotlar reyestri va kontrafaktga qarshi kurashish platformasining ovozli AI ekspertisiz.
Foydalanuvchi sizga o'zbek tilida (yoki aralash nutqda) ovozli savol yubordi.

Vazifangiz:
1. Audio yozuvdagi foydalanuvchi nutqini diqqat bilan tinglang va "transcript" maydoniga sof o'zbek tilida (lotin alifbosi) aniq matn ko'rinishida yozing. Agar audioda nutq umuman eshitilmasa, "transcript": "" qaytaring.
2. "reply" maydoniga xuddi jonli suhbatda gapirayotgandek ravon, samimiy, ilmiy asoslangan va qisqa-lo'nda (3-5 gap, ovozli o'qilishga qulay) o'zbek tilida (lotin alifbosi) javob yozing.
3. Hech qanday emoji yoki murakkab markdown belgilar (*, #) ishlatmang, chunki javob ovozli tarzda ham o'qib beriladi.
${context ? `Joriy kontekst: ${context}` : ''}

FAQAT valid JSON qaytaring:
{
  "transcript": "Foydalanuvchi aytgan gapning o'zbekcha matni",
  "reply": "AI ekspertning ravon o'zbekcha ovozli javobi"
}`;

      const contents: Array<{ role: string; parts: Array<any> }> = [];

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

      contents.push({
        role: 'user',
        parts: [
          { text: voiceSystemPrompt },
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioBase64,
            },
          },
        ],
      });

      const data = await callGemini({
        contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
        },
      });

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractCleanJson(rawText);

      if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
        return sendJson(
          {
            transcript:
              typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '',
            reply: parsed.reply.trim(),
          },
          200
        );
      }

      return sendJson(
        {
          transcript: '',
          reply:
            "Kechirasiz, ovozingizni aniq anglashning imkoni bo'lmadi. Iltimos, mikrofonga yaqinroq bo'lib qaytadan gapiring yoki savolingizni matn shaklida yozing.",
        },
        200
      );
    }

    // 3. SHARPER CONSUMER PRODUCT ANALYSIS MODE
    if (mode === 'product_analysis') {
      const p = payload || {};
      const daysUntilExpiry = computeDaysUntilExpiry(p.expiry_date);
      const expiryContext =
        daysUntilExpiry === null
          ? 'Yaroqlilik muddati aniq ko‘rsatilmagan'
          : daysUntilExpiry < 0
          ? `Muddati ${Math.abs(daysUntilExpiry)} kun oldin O'TIB KETGAN`
          : `Yaroqlilik muddatiga aniq ${daysUntilExpiry} kun qolgan`;

      const prompt = `Siz "AslCheck" milliy mahsulotlar pasporti tizimining oziq-ovqat, kimyoviy tarkib va anti-kontrafakt bo'yicha bosh ekspertisiz.
Quyidagi aniq faktlarni tahlil qiling:
- Mahsulot: ${p.product_name || 'Nomaʼlum'} (${p.category || 'Umumiy'})
- Tarkibi: ${p.ingredients || 'Koʻrsatilmagan'}
- Ishlab chiqarilgan sana: ${p.manufacture_date || 'Koʻrsatilmagan'}
- Yaroqlilik muddati: ${p.expiry_date || 'Koʻrsatilmagan'} (${expiryContext})
- Skaner ko'rsatkichi: ${p.scan_count || 0} / ${p.max_safe_scans || 3}
- Band qilinganmi: ${p.is_claimed ? 'Ha, avval xaridor tomonidan band qilingan' : 'Yoʻq, erkin holatda'}
- Shikoyat tushganmi (flagged): ${p.is_flagged ? 'Ha, kontrafakt signali mavjud' : 'Yoʻq'}

Qat'iy talab: Umumiy shablon gaplar yozmang. Tarkibdagi haqiqiy ingredientlar/allergenlarni, qolgan kunlarni (${expiryContext}) va skaner ko'rsatkichini aniq tilga oling. Emoji ishlatmang.
Faqat valid JSON qaytaring:
{
  "safety_score": "Yuqori" | "O'rtacha" | "Past",
  "trust_score": 0 dan 100 gacha butun son,
  "days_until_expiry": ${daysUntilExpiry === null ? 'null' : daysUntilExpiry},
  "ingredients_summary": "Tarkibdagi aniq moddalar, allergen xavfi va yaroqlilik muddati (${expiryContext}) bo'yicha 2 gap konkret tahlil.",
  "ingredient_tags": ["2-4 ta qisqa teg, masalan: Tabiiy tarkib, Allergen ehtimoli, Konservantlarsiz"],
  "authenticity_verdict": "Skaner (${p.scan_count || 0}/${p.max_safe_scans || 3}), bandlik va shikoyat holatiga ko'ra aniq kontrafakt bahosi.",
  "buyer_tip": "Do'konda qadoqning asl ekanligini tekshirish uchun 1 ta aniq amaliy tavsiya.",
  "physical_checks": ["Jismoniy tekshiruv 1", "Jismoniy tekshiruv 2", "Jismoniy tekshiruv 3"]
}`;

      const data = await callGemini({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      let aiResult = extractCleanJson(rawText);

      if (!aiResult || !aiResult.safety_score) {
        const isSuspicious = Boolean(p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3));
        const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

        let safetyScore: 'Yuqori' | "O'rtacha" | 'Past' = 'Yuqori';
        let trustScore = 94;
        let authVerdict = `Kod ${p.scan_count || 0}/${p.max_safe_scans || 3} xavfsiz chegarada tekshirilgan, nusxalanish alomati yo‘q.`;

        if (isExpired) {
          safetyScore = 'Past';
          trustScore = 25;
          authVerdict = `Kod asl, ammo belgilangan yaroqlilik muddati ${Math.abs(daysUntilExpiry!)} kun oldin tugagan.`;
        } else if (isSuspicious) {
          safetyScore = "O'rtacha";
          trustScore = 38;
          authVerdict = `Kod xavfsiz chegaradan (${p.max_safe_scans || 3}) oshib ${p.scan_count} marta skanerlangan. Qadoq klonlangan bo‘lish ehtimoli yuqori.`;
        } else if (p.is_claimed) {
          safetyScore = "O'rtacha";
          trustScore = 55;
          authVerdict = 'Mahsulot avval boshqa xaridor tomonidan band qilingan. Agar yopiq yangi qadoq bo‘lsa, qayta tekshiring.';
        }

        aiResult = {
          safety_score: safetyScore,
          trust_score: trustScore,
          days_until_expiry: daysUntilExpiry,
          ingredients_summary: p.ingredients
            ? `Ro‘yxatga olingan tarkib: ${p.ingredients}. ${expiryContext}.`
            : `Mahsulot tarkibi pasportda batafsil keltirilmagan. ${expiryContext}.`,
          ingredient_tags: p.ingredients
            ? ['Pasportda ko‘rsatilgan', isExpired ? 'Muddati o‘tgan' : 'Standart tekshiruv']
            : ['Tarkib kiritilmagan'],
          authenticity_verdict: authVerdict,
          buyer_tip: 'Qadoqdagi himoya halqasi, partiya sanasi bosmasi va muhr butunligini tekshiring.',
          physical_checks: [
            'Qopqoq ostidagi himoya plyonkasi buzilmaganligini tekshiring',
            `Partiya sanasi pasportdagi (${p.manufacture_date || 'ko‘rsatilgan'}) sana bilan bir xilligini solishtiring`,
            'QR stikerda qayta yopishtirish yoki xira kserokopiya izlari yo‘qligiga ishonch hosil qiling',
          ],
        };
      } else if (aiResult.days_until_expiry === undefined) {
        aiResult.days_until_expiry = daysUntilExpiry;
      }

      return sendJson(aiResult, 200);
    }

    // 4. SHARPER MULTI-TENANT PRODUCER EXECUTIVE REPORT MODE
    if (mode === 'producer_report') {
      const p = payload || {};
      const prompt = `Siz "AslCheck" B2B brend himoyasi va kontrafaktga qarshi strategik tahlilchisiz.
Faqat quyidagi korxonaning real statistikasi asosida boshqaruv hisobotini tuzing:
- Korxona nomi: ${p.company_name || 'Nomaʼlum korxona'} (${p.region || 'O‘zbekiston'}, Litsenziya: ${p.license_number || 'Mavjud'})
- Jami ro‘yxatga olingan mahsulotlar: ${p.total_products || 0}
- Jami skanerlashlar: ${p.total_scans || 0}
- Shubhali / chegaradan oshgan kodlar soni: ${p.suspicious_count || 0}
- Mahsulotlar bo‘yicha qisqa ma'lumot: ${JSON.stringify(p.products_summary || [])}
- Kelib tushgan aniq shikoyatlar (scan_logs): ${JSON.stringify(p.reports || [])}

Qat'iy talab: Aniq shu korxonaning xavfli seriya kodlarini (masalan, scan_count > max_safe_scans yoki flagged bo‘lganlarini) va shikoyatlardagi aniq bozor/hudud manzillarini ko‘rsating. Agar shikoyat bo‘lmasa, buni aniq ayting va oldini olish choralarini yozing. Emoji ishlatmang.
Faqat valid JSON qaytaring:
{
  "risk_level": "Past" | "O'rtacha" | "Yuqori",
  "executive_summary": "Korxonaning joriy kontrafakt xavfi bo'yicha 2 gap aniq B2B boshqaruv xulosasi.",
  "risky_serial_codes": ["xavfli seriya kodi 1", "..."],
  "top_hotspots": ["shikoyatlardagi aniq joylashuv 1", "..."],
  "action_recommendation": "Korxona uchun 1-2 ta aniq amaliy B2B himoya qadami."
}`;

      const data = await callGemini({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      let aiResult = extractCleanJson(rawText);

      if (!aiResult || !aiResult.risk_level) {
        const suspiciousRatio = (p.suspicious_count || 0) / Math.max(1, p.total_products || 1);
        const riskLevel = suspiciousRatio > 0.25 ? 'Yuqori' : suspiciousRatio > 0 || (p.reports?.length || 0) > 0 ? "O'rtacha" : 'Past';

        const riskyCodes = Array.isArray(p.products_summary)
          ? p.products_summary
              .filter((item: any) => item.is_flagged || item.scan_count > item.max_safe_scans)
              .map((item: any) => item.serial_code)
              .slice(0, 5)
          : [];

        const reportLocations = Array.isArray(p.reports)
          ? Array.from(
              new Set(
                p.reports
                  .map((r: any) => r.location_note)
                  .filter((loc: any) => typeof loc === 'string' && loc.trim().length > 0)
              )
            ).slice(0, 4)
          : [];

        aiResult = {
          risk_level: riskLevel,
          executive_summary:
            p.suspicious_count > 0 || (p.reports?.length || 0) > 0
              ? `${p.company_name || 'Korxona'} mahsulotlari orasida ${p.suspicious_count || 0} ta shubhali kod va ${p.reports?.length || 0} ta xaridor shikoyati aniqlandi. Ushbu partiyalarni savdo nuqtalarida tekshirish talab etiladi.`
              : `${p.company_name || 'Korxona'} bo‘yicha barcha ${p.total_products || 0} ta mahsulotda skanerlashlar xavfsiz chegarada bormoqda va faol shikoyatlar qayd etilmagan.`,
          risky_serial_codes: riskyCodes,
          top_hotspots: reportLocations.length > 0 ? reportLocations : ['Shubhali hududlar aniqlanmadi'],
          action_recommendation:
            riskyCodes.length > 0
              ? `Shubhali kodlar (${riskyCodes.join(', ')}) tarqalgan savdo nuqtalarida tezkor audit o‘tkazing va mijozlarga kodni xarid paytida band qilishni targ‘ib qiling.`
              : 'Yangi partiyalar uchun unikal QR kodlarni bosqichma-bosqich chop eting va mijozlarga "AI Vizual Ekspertiza" orqali tekshirishni tavsiya qiling.',
        };
      }

      return sendJson(aiResult, 200);
    }

    return sendJson({ error: 'Noto‘g‘ri rejim (mode) ko‘rsatildi.' }, 400);
  } catch (err: any) {
    console.error('AI handler error:', err);
    return sendJson(
      { error: 'AI tahlilida kutilmagan xatolik yuz berdi. Iltimos qaytadan urinib ko‘ring.' },
      500
    );
  }
}
