export * from './index';

export interface Database {
  public: {
    Tables: {
      manufacturers: {
        Row: import('./index').Manufacturer;
        Insert: Omit<import('./index').Manufacturer, 'id' | 'created_at'>;
        Update: Partial<import('./index').Manufacturer>;
      };
      products: {
        Row: import('./index').Product;
        Insert: Omit<import('./index').Product, 'id' | 'created_at'>;
        Update: Partial<import('./index').Product>;
      };
      scan_logs: {
        Row: import('./index').ScanLog;
        Insert: Omit<import('./index').ScanLog, 'id'>;
        Update: Partial<import('./index').ScanLog>;
      };
    };
  };
}
