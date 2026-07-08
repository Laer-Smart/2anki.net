import ConversionsTab from './ConversionsTab';
import ReturnRateTab from './ReturnRateTab';
import UploadFunnelTab from './UploadFunnelTab';
import styles from './OpsPage.module.css';

export default function GrowthTab() {
  return (
    <>
      <section
        className={styles.compositeSection}
        aria-labelledby="growth-conversions"
      >
        <h2 id="growth-conversions" className={styles.compositeHeading}>
          Conversions
        </h2>
        <ConversionsTab />
      </section>

      <section
        className={styles.compositeSection}
        aria-labelledby="growth-upload-funnel"
      >
        <h2 id="growth-upload-funnel" className={styles.compositeHeading}>
          Upload funnel
        </h2>
        <UploadFunnelTab />
      </section>

      <section
        className={styles.compositeSection}
        aria-labelledby="growth-return-rate"
      >
        <h2 id="growth-return-rate" className={styles.compositeHeading}>
          Return rate
        </h2>
        <ReturnRateTab />
      </section>
    </>
  );
}
