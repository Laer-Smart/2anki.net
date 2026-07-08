import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { track } from '../../lib/analytics/track';
import { PricingCard } from '../PricingPage/components/PricingCard';
import styles from './NotionLandingPage.module.css';

const REF = 'notion-marketplace';
const CANONICAL = 'https://2anki.net/notion-marketplace';

const CONNECT_HREF = `/register?source=${REF}&ref=${REF}`;
const UNLIMITED_HREF = `/pricing?ref=${REF}`;
const DAY_PASS_HREF = `/pricing?ref=${REF}`;

const META_DESCRIPTION =
  'Turn your Notion pages into Anki flashcards. Unlimited cards on a monthly plan, or pay once with a Day Pass. No exports, no zips.';

const UNLIMITED_BENEFITS = [
  'Unlimited flashcards from your Notion pages',
  'PDF, Markdown, HTML, and CSV support',
  'Cancel anytime',
];

const DAY_PASS_BENEFITS = [
  'Unlimited cards for 24 hours',
  'No subscription',
  'Every file format',
];

export function NotionLandingPage() {
  useEffect(() => {
    track('paywall_shown', { surface: REF });
  }, []);

  const handleUnlimitedClick = () => {
    track('paywall_upgrade_clicked', { surface: REF, plan: 'unlimited' });
  };

  const handleDayPassClick = () => {
    track('paywall_upgrade_clicked', { surface: REF, plan: 'day_pass' });
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Notion to Anki — turn your pages into flashcards | 2anki</title>
        <meta name="description" content={META_DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta
          property="og:title"
          content="Notion to Anki — turn your pages into flashcards | 2anki"
        />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className={styles.hero}>
        <h1 className={styles.heroHeadline}>
          Your Notion notes become Anki cards
        </h1>
        <p className={styles.heroSubhead}>
          Connect your workspace in 5 minutes. No exports, no zips, no manual
          steps.
        </p>
        <a href={CONNECT_HREF} className={styles.heroCta}>
          Connect Notion
        </a>
      </section>

      <hr className={styles.divider} />

      <section className={styles.plans}>
        <p className={styles.plansLabel}>Plans</p>
        <div className={styles.plansGrid}>
          <PricingCard
            badge="Recommended"
            title="Unlimited"
            priceChip="See pricing"
            benefits={UNLIMITED_BENEFITS}
            link={UNLIMITED_HREF}
            linkText="Get Unlimited"
            onLinkClick={handleUnlimitedClick}
          />
          <PricingCard
            title="Day Pass"
            price="$4"
            priceSuffix="— 24 hours"
            benefits={DAY_PASS_BENEFITS}
            link={DAY_PASS_HREF}
            linkText="Get Day Pass"
            variant="outline"
            caption="Pay once — no subscription."
            onLinkClick={handleDayPassClick}
          />
        </div>
      </section>
    </div>
  );
}

export default NotionLandingPage;
