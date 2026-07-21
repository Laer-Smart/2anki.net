import { useState } from 'react';
import { track } from '../../../lib/analytics/track';
import styles from './DevelopersSection.module.css';

const TIERS = [
  {
    key: 'sandbox',
    name: 'Sandbox',
    price: 'Free',
    volume: '100 cards/month',
    rate: '5 requests/min',
    note: 'Every API key starts here',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$29/mo',
    volume: '5 000 cards/month',
    rate: '30 requests/min',
    note: 'For a script or a small integration',
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '$99/mo',
    volume: '30 000 cards/month',
    rate: '60 requests/min',
    note: 'For a product built on 2anki',
  },
] as const;

export function DevelopersSection() {
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startCheckout = async (tierKey: string) => {
    setPendingTier(tierKey);
    setError('');
    track('dev_tier_checkout_clicked', { tier: tierKey });
    try {
      const response = await fetch('/api/checkout/developer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierKey }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Could not start checkout. Try again.');
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (checkoutError) {
      setPendingTier(null);
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Could not start checkout. Try again.'
      );
    }
  };

  return (
    <section aria-labelledby="developers-pricing">
      <h2 id="developers-pricing" className={styles.sectionLabel}>
        For developers
      </h2>
      <p className={styles.sectionIntro}>
        Convert through the API, the CLI, or an MCP client on your own key.
        Volume is metered on cards generated, separate from personal plans.
      </p>
      <div className={styles.grid}>
        {TIERS.map((tier) => (
          <div key={tier.key} className={styles.card}>
            <div className={styles.tierName}>{tier.name}</div>
            <div className={styles.tierPrice}>{tier.price}</div>
            <ul className={styles.tierFacts}>
              <li>{tier.volume}</li>
              <li>{tier.rate}</li>
            </ul>
            <p className={styles.tierNote}>{tier.note}</p>
            {tier.key === 'sandbox' ? (
              <a className={styles.tierCta} href="/developers">
                Get a key
              </a>
            ) : (
              <button
                type="button"
                className={styles.tierCta}
                onClick={() => startCheckout(tier.key)}
                disabled={pendingTier != null}
              >
                {pendingTier === tier.key ? 'Starting…' : `Get ${tier.name}`}
              </button>
            )}
          </div>
        ))}
        <div className={styles.card}>
          <div className={styles.tierName}>Custom</div>
          <div className={styles.tierPrice}>Let&rsquo;s talk</div>
          <ul className={styles.tierFacts}>
            <li>Above 100 000 cards/month</li>
            <li>Negotiated limits</li>
          </ul>
          <p className={styles.tierNote}>
            Tell us what you&rsquo;re building and your volume.
          </p>
          <a
            className={styles.tierCta}
            href="mailto:support@2anki.net?subject=Custom API volume"
          >
            Email us
          </a>
        </div>
      </div>
      {error !== '' && <p className={styles.error}>{error}</p>}
    </section>
  );
}

export default DevelopersSection;
