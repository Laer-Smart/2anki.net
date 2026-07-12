import styles from './TrustNote.module.css';

interface TrustNoteProps {
  compact?: boolean;
}

export function TrustNote({ compact = false }: Readonly<TrustNoteProps>) {
  if (compact) {
    return (
      <p className={styles.note}>
        Independent and open source since 2020, built by its contributors —
        funded by subscribers, not investors.
      </p>
    );
  }

  return (
    <p className={styles.note}>
      Independent since 2020. Built by{' '}
      <span className={styles.name}>Alexander Alemayhu</span> and its
      contributors, and funded by the people who use it — not investors.
    </p>
  );
}

export default TrustNote;
