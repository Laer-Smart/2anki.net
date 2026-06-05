import { PricingCard } from './PricingCard';
import { AUTO_SYNC_PRICE, MONTHLY_SUFFIX } from '../pricing.constants';

const AUTO_SYNC_BENEFITS = [
  'Everything in Unlimited',
  'Notion edits sync to Anki every 5 minutes',
  'Multi-device — study from any browser',
  'Cancel anytime',
];

const LEARN_MORE_HREF = '/documentation/sync/how-it-works';

interface AutoSyncCardProps {
  showNewBadge: boolean;
  isLifetime: boolean;
  isActive: boolean;
  capReached: boolean;
  caption?: string;
  waitlistLabel: string;
  waitlistDisabled: boolean;
  onSubscribe: () => void;
  onWaitlist: () => void;
}

export function AutoSyncCard({
  showNewBadge,
  isLifetime,
  isActive,
  capReached,
  caption,
  waitlistLabel,
  waitlistDisabled,
  onSubscribe,
  onWaitlist,
}: Readonly<AutoSyncCardProps>) {
  const newBadge = showNewBadge ? 'New — built for Notion' : undefined;

  if (isLifetime) {
    return (
      <PricingCard
        title="Auto Sync"
        price={AUTO_SYNC_PRICE}
        priceSuffix={MONTHLY_SUFFIX}
        hidePriceLine
        benefits={AUTO_SYNC_BENEFITS}
        caption="Included in your Lifetime plan"
        learnMoreHref={LEARN_MORE_HREF}
      />
    );
  }

  if (isActive) {
    return (
      <PricingCard
        title="Auto Sync"
        price={AUTO_SYNC_PRICE}
        priceSuffix={MONTHLY_SUFFIX}
        badge={newBadge}
        badgeMuted
        benefits={AUTO_SYNC_BENEFITS}
        onAction={() => undefined}
        actionLabel="Subscribed"
        actionDisabled
        variant="outline"
        learnMoreHref={LEARN_MORE_HREF}
      />
    );
  }

  if (capReached) {
    return (
      <PricingCard
        title="Auto Sync"
        price={AUTO_SYNC_PRICE}
        priceSuffix={MONTHLY_SUFFIX}
        badge={newBadge}
        badgeMuted
        benefits={AUTO_SYNC_BENEFITS}
        onAction={onWaitlist}
        actionLabel={waitlistLabel}
        actionDisabled={waitlistDisabled}
        variant="outline"
        caption={
          caption ?? "We're at capacity — we'll email you when a seat opens."
        }
        learnMoreHref={LEARN_MORE_HREF}
      />
    );
  }

  return (
    <PricingCard
      title="Auto Sync"
      price={AUTO_SYNC_PRICE}
      priceSuffix={MONTHLY_SUFFIX}
      badge={newBadge}
      badgeMuted
      benefits={AUTO_SYNC_BENEFITS}
      onAction={onSubscribe}
      actionLabel="Get Auto Sync"
      variant="outline"
      caption={caption}
      learnMoreHref={LEARN_MORE_HREF}
    />
  );
}
