export interface BusinessContactReference {
  id: number;
  source_company: string;
  contact_type: string;
  display_name: string;
  normalized_name: string;
  phone_numbers?: string | null;
  email?: string | null;
  full_name?: string | null;
  bill_address?: string | null;
  ship_address?: string | null;
  account_number: string;
  account_name: string;
  account_type: string;
  source_file?: string | null;
  source_row_number?: number | null;
  is_active: boolean;
}

export interface BusinessContactReferenceList {
  items: BusinessContactReference[];
  total: number;
  active_count: number;
  limit: number;
  offset: number;
  search?: string | null;
  source_file?: string | null;
}

export interface BusinessContactReferenceSeedResult {
  seeded_count: number;
  active_count: number;
  source_file: string;
}
