/**
 * AslCheck Pro - Zero-Dependency CSV / Excel TSV Bulk Parser & Template Generator
 * Supports CSV (comma or semicolon) and direct Excel / Google Sheets tab-delimited copy-paste.
 */

export interface BulkDraftItem {
  id: string;
  product_name: string;
  category: string;
  batch_number: string;
  quantity: number;
  max_safe_scans: number;
  manufacture_date: string;
  expiry_date: string;
  ingredients: string;
  serial_code?: string;
}

const VALID_CATEGORIES = [
  'Oziq-ovqat',
  'Salomatlik',
  'Ichimlik',
  'Kosmetika',
  'Hunarmandchilik',
  'Boshqa',
] as const;

export function normalizeCategory(raw?: string): string {
  const val = (raw || '').trim();
  const exact = VALID_CATEGORIES.find((c) => c.toLowerCase() === val.toLowerCase());
  if (exact) return exact;

  const lower = val.toLowerCase();
  if (/oziq|food|asal|yog|choy|sut|non/.test(lower)) return 'Oziq-ovqat';
  if (/salomat|health|dori|pharm|vitamin|tibbi/.test(lower)) return 'Salomatlik';
  if (/ichim|drink|suv|sharbat/.test(lower)) return 'Ichimlik';
  if (/kosmet|beauty|krem|sovun/.test(lower)) return 'Kosmetika';
  if (/hunar|craft|sopol|atlas/.test(lower)) return 'Hunarmandchilik';
  return 'Boshqa';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(sampleLine: string): string {
  const tabCount = (sampleLine.match(/\t/g) || []).length;
  const semiCount = (sampleLine.match(/;/g) || []).length;
  const commaCount = (sampleLine.match(/,/g) || []).length;
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

function normalizeHeaderKey(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (/^(nomi|mahsulot|mahsulotnomi|product|productname|name|tovar)$/.test(h)) return 'product_name';
  if (/^(kategoriya|category|tur|turi)$/.test(h)) return 'category';
  if (/^(partiya|partiyaraqami|batch|batchnumber)$/.test(h)) return 'batch_number';
  if (/^(miqdor|miqdori|soni|qty|quantity|count)$/.test(h)) return 'quantity';
  if (/^(skaner|maxscans|maxsafescans|limit)$/.test(h)) return 'max_safe_scans';
  if (/^(ishlabchiqarilgan|sana|manufacturedate|mfg)$/.test(h)) return 'manufacture_date';
  if (/^(yaroqlilik|muddat|muddati|expirydate|expiry|exp)$/.test(h)) return 'expiry_date';
  if (/^(tarkibi|xomashyo|ingredients)$/.test(h)) return 'ingredients';
  if (/^(seriya|seriyakodi|serial|serialcode|kod)$/.test(h)) return 'serial_code';
  return '';
}

function isIsoDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

/**
 * Parse CSV or Excel/Sheets pasted TSV text into editable BulkDraftItem rows.
 */
export function parseDelimitedProducts(rawText: string): {
  items: BulkDraftItem[];
  warnings: string[];
} {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return { items: [], warnings: [] };

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { items: [], warnings: [] };

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitDelimitedLine(lines[0], delimiter);
  const mappedHeaders = firstCells.map(normalizeHeaderKey);
  const hasHeader = mappedHeaders.some((k) => k === 'product_name' || k === 'category' || k === 'quantity');

  const colMap: Record<string, number> = {};
  if (hasHeader) {
    mappedHeaders.forEach((key, idx) => {
      if (key) colMap[key] = idx;
    });
  } else {
    // Standard positional order: Nomi | Kategoriya | Partiya | Miqdori | Muddati | Tarkibi
    colMap.product_name = 0;
    colMap.category = 1;
    colMap.batch_number = 2;
    colMap.quantity = 3;
    colMap.expiry_date = 4;
    colMap.ingredients = 5;
  }

  const today = new Date();
  const defaultMfg = today.toISOString().split('T')[0];
  const defaultExpObj = new Date(today);
  defaultExpObj.setFullYear(today.getFullYear() + 1);
  const defaultExp = defaultExpObj.toISOString().split('T')[0];

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const items: BulkDraftItem[] = [];
  const warnings: string[] = [];

  dataLines.forEach((line, idx) => {
    const cells = splitDelimitedLine(line, delimiter);
    const get = (field: string) => {
      const col = colMap[field];
      return col !== undefined && col < cells.length ? cells[col] : '';
    };

    const name = get('product_name');
    if (!name) {
      warnings.push(`${idx + (hasHeader ? 2 : 1)}-qator bo‘sh nom sababli o‘tkazildi.`);
      return;
    }

    const rawQty = parseInt(get('quantity').replace(/[^\d]/g, ''), 10);
    const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.min(100, rawQty) : 1;

    const rawMaxScans = parseInt(get('max_safe_scans').replace(/[^\d]/g, ''), 10);
    const maxScans =
      Number.isFinite(rawMaxScans) && rawMaxScans > 0 ? Math.min(20, rawMaxScans) : 3;

    const mfg = isIsoDate(get('manufacture_date')) ? get('manufacture_date') : defaultMfg;
    const exp = isIsoDate(get('expiry_date')) ? get('expiry_date') : defaultExp;

    items.push({
      id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      product_name: name,
      category: normalizeCategory(get('category')),
      batch_number: get('batch_number') || `BATCH-${today.getFullYear()}-0${(idx % 9) + 1}`,
      quantity: qty,
      max_safe_scans: maxScans,
      manufacture_date: mfg,
      expiry_date: exp,
      ingredients: get('ingredients'),
      serial_code: get('serial_code') ? get('serial_code').toUpperCase() : undefined,
    });
  });

  return { items, warnings };
}

export const SAMPLE_TSV_TEXT = [
  'Nomi\tKategoriya\tPartiya\tMiqdori\tMuddati\tTarkibi',
  "Tabiiy Tog' Asali (1kg)\tOziq-ovqat\tBATCH-2026-A1\t5\t2028-10-15\t100% tabiiy tog' gullari nektari, konservantsiz",
  "Qora Sedana Yog'i (250ml)\tSalomatlik\tBATCH-2026-B4\t5\t2027-11-01\tSovuq siqilgan birinchi navli qora sedana yog'i",
  'Orom Ko‘k Choy (200g)\tIchimlik\tBATCH-2026-C2\t5\t2028-05-20\tSaralangan yashil choy barglari',
].join('\n');

/**
 * Trigger browser download of a UTF-8 BOM Excel-compatible sample CSV template.
 */
export function downloadCsvTemplate(): void {
  const csvContent = [
    'Nomi,Kategoriya,Partiya,Miqdori,Ishlab chiqarilgan,Yaroqlilik muddati,Tarkibi',
    `"Tabiiy Tog' Asali (1kg)",Oziq-ovqat,BATCH-2026-A1,5,2026-11-01,2028-11-01,"100% tabiiy tog' gullari nektari"`,
    `"Qora Sedana Yog'i (250ml)",Salomatlik,BATCH-2026-B4,10,2026-11-01,2027-11-01,"Sovuq siqilgan tabiiy qora sedana"`,
    `"Orom Ko'k Choy (200g)",Ichimlik,BATCH-2026-C2,5,2026-11-01,2028-05-20,"Saralangan yashil choy barglari"`,
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aslcheck-mahsulotlar-shabloni.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
