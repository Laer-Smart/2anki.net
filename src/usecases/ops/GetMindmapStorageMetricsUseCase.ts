import {
  MindmapStorageMetricsService,
  MindmapStorageMetricsResponse,
} from '../../services/ops/MindmapStorageMetricsService';

export class GetMindmapStorageMetricsUseCase {
  constructor(
    private readonly service: MindmapStorageMetricsService
  ) {}

  execute(): Promise<MindmapStorageMetricsResponse> {
    return this.service.getMetrics();
  }
}
