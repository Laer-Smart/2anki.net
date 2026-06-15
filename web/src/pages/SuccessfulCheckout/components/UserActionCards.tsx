import styles from '../../../styles/shared.module.css';

const loginLink = 'https://2anki.net/login';
const registerLink = 'https://2anki.net/register';

export const UserActionCards = () => {
  return (
    <div className={styles.columns2}>
      <div>
        <h3 className={styles.sectionTitle}>Existing user</h3>
        <p>Log in with the email address associated with your payment.</p>
        <a href={loginLink} className={styles.btnPrimary}>
          Log in
        </a>
      </div>

      <div>
        <h3 className={styles.sectionTitle}>New user</h3>
        <p>
          Create an account using the same email address used for your payment.
        </p>
        <a href={registerLink} className={styles.btnPrimary}>
          Sign up
        </a>
      </div>
    </div>
  );
};
