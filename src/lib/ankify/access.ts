export interface AnkifyAccessUser {
  patreon: boolean | null;
  ankify_access?: boolean | null;
}

export interface AnkifyAccessSubscription {
  active: boolean;
  stripe_product_id?: string | null;
}

export const hasAnkifyAccess = (
  user: AnkifyAccessUser | null | undefined,
  subscriptions: AnkifyAccessSubscription[],
  autoSyncProductId: string
): boolean => {
  if (user?.patreon === true) {
    return true;
  }
  if (user?.ankify_access === true) {
    return true;
  }
  if (!Array.isArray(subscriptions)) {
    return false;
  }
  return subscriptions.some(
    (s) => s.active && s.stripe_product_id === autoSyncProductId
  );
};
