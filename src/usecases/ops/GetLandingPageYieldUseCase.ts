import {
  LandingPageYieldService,
  LandingPageYieldResponse,
} from '../../services/ops/LandingPageYieldService';

const SECONDS_PER_DAY = 24 * 60 * 60;

const WINDOW_DAYS: Record<string, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '60d': 60,
  '90d': 90,
};

const DEFAULT_WINDOW = '30d';

export class GetLandingPageYieldUseCase {
  constructor(private readonly service: LandingPageYieldService) {}

  execute(window: string | undefined): Promise<LandingPageYieldResponse> {
    const key =
      window != null && WINDOW_DAYS[window] != null ? window : DEFAULT_WINDOW;
    const days = WINDOW_DAYS[key];
    const since = new Date(Date.now() - days * SECONDS_PER_DAY * 1000);
    return this.service.getMetrics(since);
  }
}
