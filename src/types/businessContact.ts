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
  is_active: boolean;
}

export interface BusinessContactCreateRequest {
  account_side: "ar" | "ap";
  display_name: string;
  phone_numbers?: string | null;
  email?: string | null;
  full_name?: string | null;
  bill_address?: string | null;
  ship_address?: string | null;
}


export interface BusinessContactUpdateRequest {
  display_name: string;
  phone_numbers?: string | null;
  email?: string | null;
  full_name?: string | null;
  bill_address?: string | null;
  ship_address?: string | null;
}

export interface BusinessContactDeleteResult {
  deleted: boolean;
  id: number;
}

export interface BusinessContactReferenceList {
  items: BusinessContactReference[];
  total: number;
  active_count: number;
  ar_count: number;
  ap_count: number;
  limit: number;
  offset: number;
  search?: string | null;
}

export interface BusinessContactReferenceSeedResult {
  seeded_count: number;
  active_count: number;
}
