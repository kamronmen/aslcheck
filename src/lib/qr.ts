/**
 * Extract normalized serial code from raw QR payload or AslCheck URL.
 */
export function extractSerialCode(rawText: string): string {
  const text = rawText.trim();
  try {
    if (text.includes('?code=') || text.includes('&code=')) {
      const parsedUrl = new URL(text.startsWith('http') ? text : `https://aslcheck.uz/${text}`);
      const codeParam = parsedUrl.searchParams.get('code');
      if (codeParam) return codeParam.trim().toUpperCase();
    }
  } catch {
    // Fallback to pattern extraction below
  }

  // Match serial formats such as ASL-2026-001 or PRD-2026-A12
  const match = text.match(/[A-Z0-9]{2,}-[0-9]{4}-[A-Z0-9]{2,}/i);
  if (match) {
    return match[0].toUpperCase();
  }

  return text.toUpperCase();
}

/**
 * Compress an image file on an offscreen canvas to max 1024px JPEG (0.8 quality).
 */
export function compressImageForVision(
  file: File,
  maxDimension: number = 1024,
  quality: number = 0.8
): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Rasm faylini o‘qib bo‘lmadi.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Rasmni qayta ishlashda xatolik yuz berdi.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas kontekstini yaratib bo‘lmadi.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ dataUrl, base64, mimeType });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
