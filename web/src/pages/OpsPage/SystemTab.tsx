import EngineeringTab from './EngineeringTab';
import PerformanceTab from './PerformanceTab';
import styles from './OpsPage.module.css';

export default function SystemTab() {
  return (
    <>
      <section
        className={styles.compositeSection}
        aria-labelledby="system-engineering"
      >
        <h2 id="system-engineering" className={styles.compositeHeading}>
          Engineering
        </h2>
        <EngineeringTab />
      </section>

      <section
        className={styles.compositeSection}
        aria-labelledby="system-performance"
      >
        <h2 id="system-performance" className={styles.compositeHeading}>
          Performance
        </h2>
        <PerformanceTab />
      </section>
    </>
  );
}
