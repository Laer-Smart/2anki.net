import type { IApiKeyUsageRepository } from '../../data_layer/ApiKeyUsageRepository';
import type { ResolvedDeveloperTier } from './ResolveDeveloperTierUseCase';

const WARN_THRESHOLD = 0.8;

export type ApiUsageWarner = (
  email: string,
  cardsUsed: number,
  limit: number,
  tierKey: string
) => Promise<void>;

interface RecordArgs {
  userId: number;
  email: string;
  cards: number;
  tier: ResolvedDeveloperTier;
  now?: Date;
}

export class RecordApiCardUsageUseCase {
  constructor(
    private readonly usage: IApiKeyUsageRepository,
    private readonly warn: ApiUsageWarner
  ) {}

  async execute({
    userId,
    email,
    cards,
    tier,
    now = new Date(),
  }: RecordArgs): Promise<void> {
    if (cards <= 0) return;
    const total = await this.usage.incrementCards(userId, now, cards);
    if (!Number.isFinite(tier.monthly_card_limit)) return;
    if (total < tier.monthly_card_limit * WARN_THRESHOLD) return;

    const month = await this.usage.getMonth(userId, now);
    if (month.warned_at != null) return;

    const claimed = await this.usage.markWarned(userId, now);
    if (!claimed) return;
    try {
      await this.warn(email, total, tier.monthly_card_limit, tier.tier_key);
    } catch (error) {
      console.error('[api-usage] warning email failed', error);
    }
  }
}

export default RecordApiCardUsageUseCase;
