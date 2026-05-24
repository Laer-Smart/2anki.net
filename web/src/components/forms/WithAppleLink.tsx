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
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M17.05 12.04c-.02-1.78 1.45-2.64 1.52-2.68-.83-1.22-2.13-1.39-2.59-1.4-1.1-.11-2.15.65-2.71.65-.57 0-1.43-.64-2.35-.62-1.21.02-2.33.7-2.95 1.78-1.26 2.18-.32 5.4.91 7.17.6.86 1.31 1.83 2.24 1.79.9-.04 1.24-.58 2.33-.58 1.08 0 1.39.58 2.35.56.97-.02 1.58-.88 2.17-1.74.69-1 .97-1.97.98-2.02-.02-.01-1.88-.72-1.9-2.85zM15.27 6.4c.5-.6.84-1.45.74-2.29-.72.03-1.59.48-2.1 1.08-.46.53-.86 1.39-.75 2.21.79.06 1.61-.4 2.11-1z" />
      </svg>
      <span>{isCard ? 'Apple' : text}</span>
    </a>
  );
}
