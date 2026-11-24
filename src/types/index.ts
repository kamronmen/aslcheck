export interface Manufacturer {
  id: string;
  name: string;
  region: string;
  license_number: string;
  verified: boolean;
  created_at: string;
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
  scan_count: number;
  max_safe_scans: number;
  is_flagged: boolean;
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
  ingredients?: string;
  max_safe_scans?: number;
  serial_code?: string;
}
