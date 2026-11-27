export interface Manufacturer {
  id: string;
  name: string;
  region: string;
  license_number: string;
  verified: boolean;
  created_at: string;
  owner_id?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Product {
  id: string;
  manufacturer_id: string;
  serial_code: string;
  product_name: string;
  category: string;
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  ingredients: string | null;
  image_url?: string | null;
  scan_count: number;
  max_safe_scans: number;
  is_flagged: boolean;
  is_claimed?: boolean;
  claimed_at?: string | null;
  scratch_pin?: string | null;
  is_pin_verified?: boolean;
  velocity_alert?: string | null;
  created_at: string;
}

export interface ScanLog {
  id: string;
  product_id: string;
  scanned_at: string;
  device_info: string | null;
  location_note: string | null;
  is_report: boolean;
  report_message: string | null;
}

export interface ProductWithManufacturer extends Product {
  manufacturers: Manufacturer;
}

export interface ReportWithProduct extends ScanLog {
  product?: {
    id: string;
    serial_code: string;
    product_name: string;
    manufacturer_id?: string;
  } | null;
}

export interface ScanTrendPoint {
  date: string;
  label: string;
  scans: number;
  reports: number;
}

export type VerificationStatus = 'AUTHENTIC' | 'SUSPICIOUS' | 'NOT_FOUND';

export interface VerificationResult {
  status: VerificationStatus;
  product: ProductWithManufacturer | null;
  logs: ScanLog[];
  errorMessage?: string;
}

export interface NewProductPayload {
  product_name: string;
  category: string;
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  ingredients?: string | null;
  max_safe_scans?: number;
  serial_code?: string;
  manufacturer_id?: string;
  image_url?: string | null;
}

export interface RegisterCompanyPayload {
  name: string;
  region: string;
  license_number: string;
  phone: string;
  email: string;
  password: string;
}

export interface ForensicCheckItem {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface VisionVerifyResult {
  detected_code: string | null;
  confidence_score: number;
  package_match: 'Mos keladi' | 'Mos kelmaydi' | "Qisman / Aniqlab bo'lmadi";
  print_quality: 'Asl zavod bosmasi' | "O'rtacha sifat" | 'Shubhali (Kserokopiya / Xira)';
  forensic_verdict: string;
  forensic_checks: ForensicCheckItem[];
}
