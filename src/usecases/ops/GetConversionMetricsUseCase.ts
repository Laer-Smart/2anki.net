import { ConversionMetricsService } from '../../services/ops/ConversionMetricsService';

export class GetConversionMetricsUseCase {
  constructor(
    private readonly conversionMetricsService: ConversionMetricsService
  ) {}

  execute() {
    return this.conversionMetricsService.getMetrics();
  }
}

export default GetConversionMetricsUseCase;
