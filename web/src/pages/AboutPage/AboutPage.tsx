import styles from '../../styles/shared.module.css';
import pageStyles from './AboutPage.module.css';

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeaderCenter}>
        <h1 className={styles.title}>About 2anki</h1>
        <p className={styles.subtitle}>
          Turn your Notion notes into Anki flashcards — fast, free, and open
          source.
        </p>
      </header>

      <section className={pageStyles.hero}>
        <p>
          Used by autodidacts, students, and professionals around the world,
          2anki bridges the gap between Notion and Anki so you can focus on
          learning, not formatting.
        </p>
        <a href="/upload" className={pageStyles.ctaButton}>
          Convert a file
        </a>
      </section>

      <section className={pageStyles.steps}>
        <h2 className={styles.subHeading}>How it works</h2>
        <ol className={pageStyles.stepList}>
          <li className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>1</span>
            <div>
              <strong>Create toggle lists in Notion</strong>
              <p>
                The toggle line becomes the front of the card; everything inside
                becomes the back.
              </p>
            </div>
          </li>
          <li className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>2</span>
            <div>
              <strong>Export and upload to 2anki.net</strong>
              <p>
                Drop your exported zip or connect your Notion workspace
                directly.
              </p>
            </div>
          </li>
          <li className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>3</span>
            <div>
              <strong>Download and import into Anki</strong>
              <p>
                Your deck is ready — embeds, audio, images, and cloze deletions
                included.
              </p>
            </div>
          </li>
        </ol>
        <p className={pageStyles.stepsFooter}>
          Want the full walkthrough?{' '}
          <a href="/documentation/start-here/what-is-2anki">Read our guide</a>
        </p>
      </section>

      <section className={pageStyles.philosophy}>
        <h2 className={styles.subHeading}>Our philosophy</h2>
        <p>
          We are not building an Anki replacement — we are building bridges. If
          you want a different spaced repetition system, check out{' '}
          <a
            href="https://www.super-memory.com/"
            target="_blank"
            rel="noreferrer"
          >
            SuperMemo
          </a>
          .
        </p>
        <p>
          Due to server costs there are quota limits on the free tier, but the
          project is open source — you can always self-host.
        </p>
      </section>
    </div>
  );
}
