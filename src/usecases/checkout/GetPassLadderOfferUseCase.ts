import type { IUserPassRepository } from '../../data_layer/UserPassRepository';
import type { PlanSource } from '../../routes/middleware/configureUserLocal';

export interface PassLadderOffer {
  passCount: number;
  spentUsd: number;
}

const WINDOW_DAYS = 35;
const DAY_PASS_USD = 4;
const WEEK_PASS_USD = 9;
const MIN_PASSES_FOR_OFFER = 2;

export class GetPassLadderOfferUseCase {
  constructor(private readonly userPasses: IUserPassRepository) {}

  async execute(
    owner: number,
    planSource: PlanSource,
    now: Date
  ): Promise<PassLadderOffer | null> {
    if (planSource != null) {
      return null;
    }

    const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const { dayPasses, weekPasses } =
      await this.userPasses.countPaidPassesSince(owner, since);
    const passCount = dayPasses + weekPasses;
    if (passCount < MIN_PASSES_FOR_OFFER) {
      return null;
    }

    return {
      passCount,
      spentUsd: dayPasses * DAY_PASS_USD + weekPasses * WEEK_PASS_USD,
    };
  }
}
