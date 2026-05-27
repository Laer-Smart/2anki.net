export interface PricingVariantRow {
  variant: string;
  users_shown: number;
  upgrade_clicks: number;
  upgrade_click_rate_pct: number;
  paid_conversions: number;
  revenue_cents: number;
}

export interface SurfaceBreakdownRow {
  surface: string;
  distinct_users: number;
}

export interface PricingAbFunnelResponse {
  variants: PricingVariantRow[] | null;
  surface_breakdown: SurfaceBreakdownRow[] | null;
  since: string;
  as_of: string;
  error?: string;
}
