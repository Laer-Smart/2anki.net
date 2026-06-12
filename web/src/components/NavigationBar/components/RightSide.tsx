import NavbarItem from '../NavbarItem';
import { getVisibleText } from '../../../lib/text/getVisibleText';
import { ThemeToggle } from '../../ThemeSwitcher/ThemeToggle';
import styles from '../NavigationBar.module.css';

interface RightSideProps {
  path: string;
  isLoggedIn: boolean;
}

export function RightSide({ path, isLoggedIn }: Readonly<RightSideProps>) {
  return (
    <div className={styles.navEnd}>
      <NavbarItem href="/upload" path={path}>
        {getVisibleText('navigation.upload')}
      </NavbarItem>
      <NavbarItem href="/print" path={path}>
        {getVisibleText('navigation.print')}
      </NavbarItem>
      <NavbarItem href="/documentation" path={path}>
        {getVisibleText('navigation.docs')}
      </NavbarItem>
      {isLoggedIn && (
        <NavbarItem href="/pricing" path={path}>
          {getVisibleText('navigation.pricing')}
        </NavbarItem>
      )}
      <NavbarItem href="/login#login" path={path}>
        {getVisibleText('navigation.login')}
      </NavbarItem>
      <ThemeToggle />
    </div>
  );
}
