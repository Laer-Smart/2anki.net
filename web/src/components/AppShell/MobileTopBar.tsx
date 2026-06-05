import { useTheme } from '../../lib/hooks/useTheme';
import styles from './AppShell.module.css';

interface MobileTopBarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function MobileTopBar({
  isOpen,
  onOpen,
  onClose,
}: Readonly<MobileTopBarProps>) {
  const onClick = isOpen ? onClose : onOpen;
  const theme = useTheme();
  const logoSrc =
    theme === 'light' ? '/mascot/navbar-logo.png' : '/mascot/Notion 1.png';
  return (
    <div className={styles.mobileTopBar}>
      <button
        type="button"
        className={styles.mobileBurger}
        aria-label="Open navigation"
        aria-expanded={isOpen}
        aria-controls="app-sidebar-drawer"
        onClick={onClick}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <a className={styles.mobileLogo} href="/" aria-label="2anki home">
        <img src={logoSrc} alt="" />
      </a>
      <span aria-hidden="true" />
    </div>
  );
}
