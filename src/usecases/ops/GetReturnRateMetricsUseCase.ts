import {
  ReturnRateMetricsResponse,
  ReturnRateMetricsService,
} from '../../services/ops/ReturnRateMetricsService';

export class GetReturnRateMetricsUseCase {
  constructor(private readonly service: ReturnRateMetricsService) {}

  execute(): Promise<ReturnRateMetricsResponse> {
    return this.service.getMetrics();
  }
}
