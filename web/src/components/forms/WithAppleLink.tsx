import { getAppleSignInUrl } from '../../lib/backend/getAppleSignInUrl';
import styles from '../../styles/auth.module.css';

interface WithAppleLinkProps {
  text: string;
  variant?: 'row' | 'card';
}

export function WithAppleLink({
  text,
  variant = 'row',
}: Readonly<WithAppleLinkProps>) {
  const isCard = variant === 'card';
  return (
    <a
      href={getAppleSignInUrl()}
      className={isCard ? styles.appleCard : styles.appleButton}
      aria-label={isCard ? text : undefined}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 814 1000"
        width="20px"
        height="20px"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.6 0 280.8 0 189.6C0 85.2 57.2 24.7 150.1 24.7c89.1 0 152.6 54.4 209.8 54.4 55.4 0 127.4-57.8 224.9-57.8 32.7 0 139.5 3.2 211.5 98.4zm-181.5-111.4c15.3-36.6 24-75.1 24-113.9 0-11.3-.6-24-2.6-33.9-60.7 5.8-129.4 40.8-171.1 82.5-32.1 33.3-61.5 80.4-61.5 120.6 0 11.3 1.9 24 3.2 28.5 3.2.6 8.4 1.3 12.9 1.3 56.4 0 119.3-35.7 195.1-84.1z" />
      </svg>
      <span>{isCard ? 'Apple' : text}</span>
    </a>
  );
}
