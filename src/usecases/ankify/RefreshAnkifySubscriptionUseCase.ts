import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkiConnectUnreachableError } from '../../services/ankify/AnkiConnectClient';
import {
  isAnkifyClientOfflineSkip,
  SyncNotionPageResult,
  SyncNotionPageToRacUseCase,
} from './SyncNotionPageToRacUseCase';

export class SubscriptionNotFoundError extends Error {
  constructor() {
    super('Subscription not found');
    this.name = 'SubscriptionNotFoundError';
  }
}

export class RefreshCooldownError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Refresh on cooldown — retry in ${retryAfterSeconds}s`);
    this.name = 'RefreshCooldownError';
  }
}

export interface RefreshAnkifySubscriptionInput {
  id: number;
  owner: number;
  ankiConnectHost?: string;
}

const DEFAULT_COOLDOWN_MS = 30_000;

export class RefreshAnkifySubscriptionUseCase {
  private readonly lastRunAtBySubscription = new Map<number, number>();

  constructor(
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly syncNotionPageUseCase: SyncNotionPageToRacUseCase,
    private readonly cooldownMs: number = DEFAULT_COOLDOWN_MS,
    private readonly now: () => number = () => Date.now()
  ) {}

  async execute(
    input: RefreshAnkifySubscriptionInput
  ): Promise<SyncNotionPageResult> {
    const subscription = await this.subscriptions.findById(
      input.id,
      input.owner
    );
    if (subscription == null) {
      throw new SubscriptionNotFoundError();
    }

    const startedAt = this.now();
    const previous = this.lastRunAtBySubscription.get(subscription.id);
    if (previous != null) {
      const elapsedMs = startedAt - previous;
      if (elapsedMs < this.cooldownMs) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((this.cooldownMs - elapsedMs) / 1000)
        );
        throw new RefreshCooldownError(retryAfterSeconds);
      }
    }
    this.lastRunAtBySubscription.set(subscription.id, startedAt);

    const result = await this.syncNotionPageUseCase.execute({
      owner: input.owner,
      notionPageId: subscription.notion_page_id,
      notionPageTitle: subscription.notion_page_title,
      notionPageUrl: subscription.notion_page_url,
      notionPageIcon: subscription.notion_page_icon,
      knownObjectType: subscription.notion_object_type ?? null,
      trigger: 'manual',
      ankiConnectHost: input.ankiConnectHost,
    });
    if (isAnkifyClientOfflineSkip(result)) {
      throw new AnkiConnectUnreachableError(
        input.ankiConnectHost ?? 'localhost',
        null
      );
    }
    return result;
  }
}
