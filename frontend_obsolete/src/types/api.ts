export type Config = Record<string, unknown>;

export type Lead = {
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  phone_number: string | null;
  listing_url: string | null;
  is_private: number;
  confidence: number;
  reason: string | null;
  status: string | null;
  message_subject: string | null;
  message_body: string | null;
  channel: string | null;
  timestamp: number;
};

export type Agent = {
  id: number;
  agency_name: string | null;
  listing_title: string | null;
  price: string | null;
  location: string | null;
  url: string | null;
  contact: string | null;
  reason: string | null;
  timestamp: number;
};

export type ActivityLog = {
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  listing_url: string | null;
  status: string | null;
  channel: string | null;
  timestamp: number;
  time: string;
};

export type RunStatus = "idle" | "starting" | "running" | "stopped" | "error";

export type StreamLine = {
  type: "status" | "stdout" | "stderr" | "exit";
  data: string;
};

export type ListingType = {
  value: string;
  label: string;
  path: string;
};

export type SiteInfo = {
  id: string;
  label: string;
  baseUrl: string;
  listingTypes?: ListingType[];
};

export type TargetsData = {
  countries: string[];
  defaultListingTypes?: ListingType[];
  sitesByCountry?: Record<string, SiteInfo[]>;
};

export type DatabaseInfo = {
  configured: boolean;
  cluster?: string;
  user?: string;
  message?: string;
};

export type PipelineStep = {
  name: string;
  icon: string;
  description: string;
};

/** Property fields aligned to schema-realestate-listings-standard.json where applicable */
export type CrmProperty = {
  id: number;
  owner_id: number;
  listing_ref: string | null;
  title: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surface_m2: number | null;
  location: string | null;
  description: string | null;
  listing_url: string | null;
  contact_email: string | null;
  phone_number: string | null;
  phone_source: string | null;
  transaction_type: string | null;
  viability_score: number | null;
  recommendation: string | null;
  estimated_annual_gross: number | null;
  price_to_earnings: number | null;
  degree_of_certainty: string | null;
  sales_pipeline_stage: string | null;
  chatbot_pipeline_stage: string | null;
  last_contact_date: number | null;
  created_at: number | null;
  updated_at: number | null;
  // Schema-aligned (listing standard)
  address?: string | null;
  source_platform?: string | null;
  source?: string | null;
  rent_price?: number | null;
  sale_price?: number | null;
  rooms?: number | null;
  deposit?: number | null;
  monthly_charges?: number | null;
  terrace_m2?: number | null;
  year_of_construction?: number | null;
  first_seen?: string | null;
  last_updated?: string | null;
  image_urls?: string | null; // JSON string or array
  rental_terms?: string | null;
  photos?: string | null;
  estimated_operating_costs?: number | null;
  cash_flow_projection?: number | null;
  risk_indicators?: string | null;
  automation_enabled?: number | null;
  ai_stop_stage?: string | null;
};

export type CrmOwner = {
  id: number;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_notes: string | null;
  created_at: number | null;
  updated_at: number | null;
  properties: CrmProperty[];
  last_contact_date: number | null;
};
