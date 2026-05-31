import type {
  IEventsRepository,
  UploadFunnelStageRow,
} from '../../data_layer/EventsRepository';

export interface UploadFunnelStages {
  upload_started: number;
  conversion_succeeded: number;
  conversion_failed: number;
  deck_downloaded: number;
  paywall_shown: number;
  signup: number;
  paid: number;
}

export interface UploadFunnelResponse {
  stages: UploadFunnelStages | null;
  upload_to_download_rate_pct: number;
  download_to_signup_rate_pct: number;
  download_to_paid_rate_pct: number;
  since: string;
  as_of: string;
  error?: string;
}

interface UploadFunnelServiceDeps {
  eventsRepo: IEventsRepository;
}

export class UploadFunnelService {
  private readonly eventsRepo: IEventsRepository;

  constructor(deps: UploadFunnelServiceDeps) {
    this.eventsRepo = deps.eventsRepo;
  }

  async getMetrics(since: Date): Promise<UploadFunnelResponse> {
    const as_of = new Date().toISOString();
    const sinceStr = since.toISOString();

    let rows: UploadFunnelStageRow[];
    try {
      rows = await this.eventsRepo.groupUploadFunnel(since);
    } catch (err) {
      return {
        stages: null,
        upload_to_download_rate_pct: 0,
        download_to_signup_rate_pct: 0,
        download_to_paid_rate_pct: 0,
        since: sinceStr,
        as_of,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const stages = this.toStages(rows);
    const upload_to_download_rate_pct =
      stages.upload_started > 0
        ? (stages.deck_downloaded / stages.upload_started) * 100
        : 0;
    const download_to_signup_rate_pct =
      stages.deck_downloaded > 0
        ? (stages.signup / stages.deck_downloaded) * 100
        : 0;
    const download_to_paid_rate_pct =
      stages.deck_downloaded > 0
        ? (stages.paid / stages.deck_downloaded) * 100
        : 0;

    return {
      stages,
      upload_to_download_rate_pct,
      download_to_signup_rate_pct,
      download_to_paid_rate_pct,
      since: sinceStr,
      as_of,
    };
  }

  private toStages(rows: UploadFunnelStageRow[]): UploadFunnelStages {
    const byStage = new Map<string, number>();
    for (const row of rows) {
      byStage.set(row.stage, row.distinct_identities);
    }
    return {
      upload_started: byStage.get('upload_started') ?? 0,
      conversion_succeeded: byStage.get('conversion_succeeded') ?? 0,
      conversion_failed: byStage.get('conversion_failed') ?? 0,
      deck_downloaded: byStage.get('deck_downloaded') ?? 0,
      paywall_shown: byStage.get('paywall_shown') ?? 0,
      signup: byStage.get('account_created') ?? 0,
      paid: byStage.get('checkout_completed') ?? 0,
    };
  }
}
