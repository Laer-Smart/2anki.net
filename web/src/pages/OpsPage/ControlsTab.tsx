import CommandsTab from './CommandsTab';
import FlagsTab from './FlagsTab';
import ShowcaseTab from './ShowcaseTab';
import styles from './OpsPage.module.css';

export default function ControlsTab() {
  return (
    <>
      <section className={styles.compositeSection}>
        <CommandsTab />
      </section>

      <section className={styles.compositeSection}>
        <FlagsTab />
      </section>

      <section className={styles.compositeSection}>
        <ShowcaseTab />
      </section>
    </>
  );
}
