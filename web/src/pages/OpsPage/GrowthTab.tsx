import ConversionsTab from './ConversionsTab';
import ReturnRateTab from './ReturnRateTab';
import UploadFunnelTab from './UploadFunnelTab';
import LandingPageYieldTab from './LandingPageYieldTab';
import CustomerSignalsTab from './CustomerSignalsTab';
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
        aria-labelledby="growth-landing-page-yield"
      >
        <h2 id="growth-landing-page-yield" className={styles.compositeHeading}>
          Landing page yield
        </h2>
        <LandingPageYieldTab />
      </section>

      <section
        className={styles.compositeSection}
        aria-labelledby="growth-customer-signals"
      >
        <h2 id="growth-customer-signals" className={styles.compositeHeading}>
          Customer signals
        </h2>
        <CustomerSignalsTab />
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
