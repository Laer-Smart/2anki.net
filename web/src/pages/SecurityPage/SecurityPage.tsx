import styles from '../../styles/shared.module.css';
import pageStyles from './SecurityPage.module.css';

export default function SecurityPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Security</h1>

      <section className={pageStyles.section}>
        <h2>Report a vulnerability</h2>
        <p>Email support@2anki.net with details of what you found.</p>
      </section>

      <section className={pageStyles.section}>
        <h2>What to include</h2>
        <p>
          A clear write-up of the issue, steps to reproduce it, what you were
          able to access or affect, and how severe you think it is. A working
          proof of concept is helpful but not required.
        </p>
      </section>

      <section className={pageStyles.section}>
        <h2>Scope</h2>
        <p>
          In scope: 2anki.net and its subdomains, the API, authentication flows,
          file upload and conversion, user data, and the 2anki/server GitHub
          repository.
        </p>
        <p>
          Out of scope: third-party services we integrate with (Notion, Stripe,
          Anthropic, AnkiWeb), social engineering, physical attacks, denial of
          service without a working amplification proof of concept, automated
          scanner output without a reproducible exploit, missing security headers
          or version disclosure without demonstrated impact, and findings on
          forks or preview deploys.
        </p>
      </section>

      <section className={pageStyles.section}>
        <h2>Response time</h2>
        <p>
          We acknowledge reports within 5 business days. We aim to resolve
          critical issues within 30 days. This is best-effort — 2anki is a
          small team. If you have not heard back in a week, follow up at the
          same address.
        </p>
      </section>

      <section className={pageStyles.section}>
        <h2>Rewards</h2>
        <p>
          No monetary bounty. If you would like to be credited, say so in your
          report and we will add your name to the acknowledgements below once
          the issue is resolved.
        </p>
      </section>

      <section className={pageStyles.section}>
        <h2>Acknowledgements</h2>
        <p>No reports yet.</p>
      </section>
    </div>
  );
}
