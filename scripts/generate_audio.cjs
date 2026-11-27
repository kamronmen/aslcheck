const fs = require('fs');
const path = require('path');

// Read GEMINI_API_KEY from .env
const dotenv = fs.readFileSync('.env', 'utf8');
let apiKey = '';
dotenv.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts[0].trim() === 'GEMINI_API_KEY') {
    apiKey = parts.slice(1).join('=').trim();
  }
});

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const pcmToWavBuffer = (pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) => {
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

const scenes = [
  {
    id: 1,
    title: 'Kirish',
    text: "Assalomu alaykum! Bu — AslCheck PRO, O'zbekistonda mahsulotlar haqiqiyligini tekshirish va kontrafaktga qarshi kurashuvchi milliy sun'iy intellekt platformasi."
  },
  {
    id: 2,
    title: 'Haqiqiy mahsulot tekshiruvi',
    text: "Xaridor mahsulotdagi unikal kodni kiritadi yoki QR skaner qiladi. Bir soniyada rasmiy raqamli pasport ochiladi: yuz foiz haqiqiy, laboratoriya sertifikati va ishlab chiqaruvchi tasdiqlangan."
  },
  {
    id: 3,
    title: 'AI Ekspert va Tarkib Tahlili',
    text: "O'rnatilgan Gemini sun'iy intellekti mahsulot tarkibini chuqur tahlil qiladi, allergenlarni tekshiradi va xaridor bilan o'zbek tilida bevosita ovozli muloqot qiladi."
  },
  {
    id: 4,
    title: 'Anti-Klon Ogohlantirishi',
    text: "Agar firibgarlar bitta kodni nusxalab, soxta qadoqlarga yopishtirsa — tizim klonlangan kodni darhol aniqlaydi va qizil xavf signali bilan xaridorni ogohlantiradi."
  },
  {
    id: 5,
    title: 'B2B Kabinet va QR Generator',
    text: "Ishlab chiqaruvchilar uchun qulay kabinet: sun'iy intellekt yoki Excel orqali bir soniyada yuzlab unikal QR-kodlar yaratish, skanerlash statistikasini kuzatish va chop etish imkoniyati."
  },
  {
    id: 6,
    title: 'Xulosa va Yakun',
    text: "AslCheck PRO — milliy brendlarimiz himoyasi va xalqimiz salomatligi garovi. AslCheck nuqta vercel nuqta app!"
  }
];

async function generateSpeech(text, outPath) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [{ text: `Quyidagi o'zbekcha matnni aniq, jonli va professional diktor ohangida o'qib bering:\n\n${text}` }]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Kore'
          }
        }
      }
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS API failed: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) {
    throw new Error('No audio returned in response');
  }

  const rawBuffer = Buffer.from(inline.data, 'base64');
  let wavBuffer;
  if (rawBuffer.length >= 44 && rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    wavBuffer = rawBuffer;
  } else {
    wavBuffer = pcmToWavBuffer(rawBuffer, 24000, 1, 16);
  }

  fs.writeFileSync(outPath, wavBuffer);
  // Calculate duration in seconds: data bytes / (24000 * 2)
  const durationSec = (wavBuffer.length - 44) / 48000;
  return durationSec;
}

async function run() {
  const outDir = path.resolve('video_assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timings = [];
  console.log('Generating voiceover clips with Gemini TTS in Uzbek...');

  for (const scene of scenes) {
    const filePath = path.join(outDir, `scene_${scene.id}.wav`);
    console.log(`[Scene ${scene.id}] ${scene.title}...`);
    try {
      const dur = await generateSpeech(scene.text, filePath);
      console.log(`  -> Saved ${filePath} (${dur.toFixed(2)}s)`);
      timings.push({ id: scene.id, title: scene.title, file: filePath, duration: dur });
    } catch (e) {
      console.error(`  -> Failed for scene ${scene.id}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(outDir, 'timings.json'), JSON.stringify(timings, null, 2));
  console.log('Finished audio generation. Timings saved to video_assets/timings.json');
}

run();
