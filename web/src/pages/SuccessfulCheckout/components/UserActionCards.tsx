import { useTranslation } from 'react-i18next';
import styles from '../../../styles/shared.module.css';

const loginLink = 'https://2anki.net/login';
const registerLink = 'https://2anki.net/register';

export const UserActionCards = () => {
  const { t } = useTranslation('account');
  return (
    <div className={styles.columns2}>
      <div>
        <h3 className={styles.sectionTitle}>{t('checkout.existingUser')}</h3>
        <p>{t('checkout.existingUserBody')}</p>
        <a href={loginLink} className={styles.btnPrimary}>
          {t('checkout.logIn')}
        </a>
      </div>

      <div>
        <h3 className={styles.sectionTitle}>{t('checkout.newUser')}</h3>
        <p>{t('checkout.newUserBody')}</p>
        <a href={registerLink} className={styles.btnPrimary}>
          {t('checkout.signUp')}
        </a>
      </div>
    </div>
  );
};
