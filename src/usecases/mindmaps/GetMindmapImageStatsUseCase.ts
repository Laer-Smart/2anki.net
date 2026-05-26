import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';

export interface MindmapImageStatsResponse {
  total: number;
  with_images: number;
  ratio: number | null;
  as_of: string;
}

function ratioFromCounts(total: number, withImages: number): number | null {
  if (total === 0) return null;
  return Math.round((withImages / total) * 10000) / 10000;
}

export class GetMindmapImageStatsUseCase {
  constructor(private readonly repository: MindmapRepositoryInterface) {}

  async execute(): Promise<MindmapImageStatsResponse> {
    const stats = await this.repository.getMindmapImageStats();
    return {
      total: stats.total,
      with_images: stats.with_images,
      ratio: ratioFromCounts(stats.total, stats.with_images),
      as_of: new Date().toISOString(),
    };
  }
}
