export interface PauseCollectionShape {
  behavior?: string | null;
  resumes_at?: number | null;
}

export interface PausableSubscription {
  pause_collection?: PauseCollectionShape | null;
}

export const isPaused = (
  subscription: PausableSubscription | null
): boolean => {
  const pause = subscription?.pause_collection;
  return pause != null && pause.behavior != null;
};

export const pausedResumesAt = (
  subscription: PausableSubscription | null
): number | null => {
  if (!isPaused(subscription)) {
    return null;
  }
  return subscription?.pause_collection?.resumes_at ?? null;
};
