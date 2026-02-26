/**
 * App-level configuration with environment variable overrides.
 * Set these in .env.local to tune behaviour without touching code.
 */

/** Fresh Listings: only show listings scraped in the last N hours. Default: 72 h (3 days) */
export const FRESH_LISTINGS_MAX_HOURS = Number(
  process.env.FRESH_LISTINGS_MAX_HOURS ?? 72
)

/** Available Listings: only show listings older than N hours (so they don't appear in both views). Default: 24 h */
export const AVAILABLE_LISTINGS_MIN_HOURS = Number(
  process.env.AVAILABLE_LISTINGS_MIN_HOURS ?? 24
)

/** Rows per page in paginated views */
export const PAGE_SIZE = 25
