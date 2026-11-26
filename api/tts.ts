export default async function handler(req: any, res?: any) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (res && typeof res.setHeader === 'function') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  }

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

  const pcmToWavBuffer = (
    pcmBuffer: Buffer,
    sampleRate: number = 24000,
    numChannels: number = 1,
    bitDepth: number = 16
  ): Buffer => {
    const byteRate = sampleRate * numChannels * (bitDepth / 8);
    const blockAlign = numChannels * (bitDepth / 8);
    const dataSize = pcmBuffer.length;
    const wavHeader = Buffer.alloc(44);

    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + dataSize, 4);
    wavHeader.write('WAVE', 8);

    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(blockAlign, 32);
    wavHeader.writeUInt16LE(bitDepth, 34);

    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);

    return Buffer.concat([wavHeader, pcmBuffer]);
  };

  let body: any = {};
  try {
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else if (typeof req.json === 'function') {
      body = await req.json();
    }
  } catch (err) {
    console.warn('Failed to parse request body in /api/tts:', err);
  }

  const rawText = body?.text || '';
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return sendJson({ error: 'Matn kiritilmadi.', fallback: true }, 400);
  }

  // Strip markdown formatting while preserving hyphenated Uzbek words (QR-kod, E-qo'shimchalar)
  const cleanText = rawText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*`_~>[\]()]/g, ' ')
    .replace(/(^|\s)[•\-+]\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);

  if (!cleanText) {
    return sendJson({ error: 'O‘qish uchun matn topilmadi.', fallback: true }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey || apiKey.length < 10) {
    return sendJson({
      error: 'GEMINI_API_KEY sozlanmagan.',
      fallback: true,
    });
  }

  // Ordered by latency, quota availability, and native WAV reliability
  const ttsModels: Array<{ model: string; addPrefix: boolean }> = [
    { model: 'gemini-3.8-flash-lite-tts', addPrefix: false },
    { model: 'gemini-3.8-flash-tts', addPrefix: false },
    { model: 'gemini-3.1-flash-tts-preview', addPrefix: false },
    { model: 'gemini-2.5-flash-preview-tts', addPrefix: true },
  ];

  for (const { model, addPrefix } of ttsModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const promptText = addPrefix
        ? `Quyidagi o'zbek tilidagi matnni aniq va ravon ovozda o'qib bering:\n\n${cleanText}`
        : cleanText;

      const payload = {
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`TTS model ${model} returned ${response.status}:`, errorText.slice(0, 200));
        continue;
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const inlineData = Array.isArray(parts)
        ? parts.find((p: any) => p?.inlineData?.data)?.inlineData
        : null;

      if (inlineData && inlineData.data) {
        const rawBuffer = Buffer.from(inlineData.data, 'base64');
        const isAlreadyWav =
          rawBuffer.length >= 44 && rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF';

        let wavBuffer: Buffer;
        let sampleRate = 24000;

        if (isAlreadyWav) {
          wavBuffer = rawBuffer;
          sampleRate = rawBuffer.readUInt32LE(24) || 24000;
        } else {
          const rawMime = inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
          const rateMatch = rawMime.match(/rate=(\d+)/i);
          if (rateMatch) {
            sampleRate = parseInt(rateMatch[1], 10);
          }
          wavBuffer = pcmToWavBuffer(rawBuffer, sampleRate, 1, 16);
        }

        return sendJson({
          audioBase64: wavBuffer.toString('base64'),
          mimeType: 'audio/wav',
          sampleRate,
          model,
        });
      }
    } catch (err) {
      console.warn(`TTS attempt with model ${model} failed:`, err);
    }
  }

  return sendJson({
    error: 'Gemini TTS audio generatsiya qilib bo‘lmadi.',
    fallback: true,
  });
}
