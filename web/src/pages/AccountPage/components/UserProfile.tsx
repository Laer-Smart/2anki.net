import styles from '../AccountPage.module.css';

interface User {
  name: string;
  email: string;
}

interface UserProfileProps {
  readonly user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const isPrivateRelay = user.email.endsWith('@privaterelay.appleid.com');

  return (
    <section className={styles.section}>
      <p className={styles.name} data-hj-suppress>
        {user.name}
      </p>
      <p className={styles.email} data-hj-suppress>
        {user.email}
      </p>
      {isPrivateRelay && (
        <p className={styles.privacyNote}>
          Hide My Email — Apple forwards messages to your real inbox.
        </p>
      )}
    </section>
  );
}
