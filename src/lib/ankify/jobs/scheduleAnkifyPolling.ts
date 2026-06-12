import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { SyncNotionPageToRacUseCase } from '../../../usecases/ankify/SyncNotionPageToRacUseCase';

export const ANKIFY_POLLING_INTERVAL_MS = 5 * 60 * 1000;

export const scheduleAnkifyPolling = (
  subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
  useCase: SyncNotionPageToRacUseCase,
  options: {
    intervalMs?: number;
    refreshTopLevelPagesForOwner?: (owner: number) => Promise<void> | void;
  } = {}
): NodeJS.Timeout => {
  const intervalMs = options.intervalMs ?? ANKIFY_POLLING_INTERVAL_MS;
  const refreshTopLevelPagesForOwner = options.refreshTopLevelPagesForOwner;

  const tick = async () => {
    let active: Awaited<ReturnType<typeof subscriptions.listEnabled>>;
    try {
      active = await subscriptions.listEnabled();
    } catch (error) {
      console.error('[ankify-polling] failed to list subscriptions', error);
      return;
    }
    const seenOwners = new Set<number>();
    for (const sub of active) {
      try {
        const current = await subscriptions.findByOwnerAndPageId(
          sub.owner,
          sub.notion_page_id
        );
        if (current == null) {
          continue;
        }
        await useCase.execute({
          owner: sub.owner,
          notionPageId: sub.notion_page_id,
          knownObjectType: current.notion_object_type ?? null,
          trigger: 'polling',
        });
      } catch (error) {
        console.error(
          `[ankify-polling] sync failed for subscription ${sub.id}`,
          error
        );
      }
      if (refreshTopLevelPagesForOwner && !seenOwners.has(sub.owner)) {
        seenOwners.add(sub.owner);
        try {
          await refreshTopLevelPagesForOwner(sub.owner);
        } catch (error) {
          console.error(
            `[ankify-polling] top-level pages refresh failed for owner ${sub.owner}`,
            error
          );
        }
      }
    }
  };

  return setInterval(tick, intervalMs);
};
