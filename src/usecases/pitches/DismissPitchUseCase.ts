import type { PitchPlacement } from '../../data_layer/PitchDismissalsRepository';

const VALID_PLACEMENTS: PitchPlacement[] = [
  'convert_success',
  'account_banner',
  'producer_prompt',
];

interface DismissalWritePort {
  upsertDismissal(userId: string, placement: PitchPlacement): Promise<void>;
}

export class DismissPitchUseCase {
  constructor(private readonly dismissalRepo: DismissalWritePort) {}

  async execute(userId: string, placement: PitchPlacement): Promise<void> {
    if (!VALID_PLACEMENTS.includes(placement)) {
      throw new Error(`Invalid placement: ${placement}`);
    }
    await this.dismissalRepo.upsertDismissal(userId, placement);
  }
}
