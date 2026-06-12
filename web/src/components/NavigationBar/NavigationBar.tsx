import { useState } from 'react';

import { useTheme } from '../../lib/hooks/useTheme';
import styles from './NavigationBar.module.css';
import { RightSide } from './components/RightSide';

interface NavigationBarProps {
  isLoggedIn: boolean | undefined;
}

function NavigationBar({ isLoggedIn }: Readonly<NavigationBarProps>) {
  const [active, setActive] = useState(false);
  const path = globalThis.location.pathname;
  const theme = useTheme();
  const isLight = theme === 'light';
  const logoSrc = isLight ? '/mascot/navbar-logo.png' : '/mascot/Notion 1.png';
  const logoWidth = isLight ? 103 : 33;

  const isResolved = isLoggedIn !== undefined;

  return (
    <nav className={styles.navbar} aria-label="main navigation">
      <div className={styles.brand}>
        <a className={styles.logoLink} href="/">
          <img
            src={logoSrc}
            alt="2anki Logo"
            width={logoWidth}
            height={28}
            fetchPriority="high"
          />
        </a>
        <button
          type="button"
          className={styles.burger}
          aria-label="menu"
          aria-expanded={active}
          onClick={() => setActive(!active)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div className={active ? styles.menuActive : styles.menu}>
        {isResolved && <RightSide path={path} isLoggedIn={isLoggedIn} />}
      </div>
    </nav>
  );
}

export default NavigationBar;
