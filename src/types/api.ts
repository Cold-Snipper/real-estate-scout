export type Config = Record<string, unknown>;

export type Lead = {
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source_url: string | null;
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
  source_url: string | null;
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
