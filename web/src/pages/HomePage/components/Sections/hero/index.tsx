import HeroText from './HeroText';
import shared from '../../../../../styles/shared.module.css';
import styles from './Hero.module.css';

function HeroSection() {
  return (
    <div className={shared.heroSection}>
      <div className={shared.heroInner}>
        <h1 className={styles.heroTitleContainer}>
          <span className={styles.heroTitle}>
            Convert{' '}
            <span className={`${styles.heroTitle} ${styles.heroSubtitle}`}>
              Notion to Anki{' '}
            </span>
            <span
              className={`${styles.heroTitle} ${styles.heroSubtitleAlignRight}`}
            >
              fast
            </span>
          </span>
        </h1>
        <HeroText>
          Drop a Notion export, PDF, or markdown file and get a beautiful Anki
          deck back. Free and open source.
        </HeroText>
      </div>
    </div>
  );
}

export default HeroSection;
