import type {
  ILandingPageYieldRepository,
  LandingPageYieldRow,
} from '../../data_layer/LandingPageYieldRepository';

export interface LandingPageYieldEntry {
  origin: string | null;
  signups: number;
  subscription_conversions: number;
  pass_conversions: number;
  paid_conversion_rate_pct: number;
}

export interface LandingPageYieldResponse {
  pages: LandingPageYieldEntry[] | null;
  since: string;
  as_of: string;
  error?: string;
}

interface LandingPageYieldServiceDeps {
  repo: ILandingPageYieldRepository;
}

function roundRate(paid: number, signups: number): number {
  if (signups <= 0) return 0;
  return Math.round((paid / signups) * 100);
}

export class LandingPageYieldService {
  private readonly repo: ILandingPageYieldRepository;

  constructor(deps: LandingPageYieldServiceDeps) {
    this.repo = deps.repo;
  }

  async getMetrics(since: Date): Promise<LandingPageYieldResponse> {
    const as_of = new Date().toISOString();
    const sinceStr = since.toISOString();

    let rows: LandingPageYieldRow[];
    try {
      rows = await this.repo.groupByOrigin(since);
    } catch (err) {
      return {
        pages: null,
        since: sinceStr,
        as_of,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const pages = rows.map((row) => ({
      origin: row.origin,
      signups: row.signups,
      subscription_conversions: row.subscription_conversions,
      pass_conversions: row.pass_conversions,
      paid_conversion_rate_pct: roundRate(row.paid_conversions, row.signups),
    }));

    return { pages, since: sinceStr, as_of };
  }
}
