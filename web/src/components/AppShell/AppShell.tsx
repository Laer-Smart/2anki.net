import React, { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import {
  injectAdSenseScript,
  removeAdSenseScript,
} from '../AdSense/AdSenseScript';
import { PageLayout } from '../Layout/PageLayout';
import { isEmbeddedAppWebView } from './isEmbeddedAppWebView';
import { SidebarFeatures, SidebarLocals } from './Sidebar';
import { SidebarLayout } from './SidebarLayout';

const TOP_BAR_PATHS = new Set(['/login', '/register', '/forgot']);
const TOP_BAR_PREFIXES = ['/users/r/'];

function shouldForceTopBar(pathname: string): boolean {
  if (TOP_BAR_PATHS.has(pathname)) return true;
  return TOP_BAR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

interface AppShellProps {
  isLoggedIn: boolean | undefined;
  email: string | null | undefined;
  locals: SidebarLocals | undefined | null;
  features: SidebarFeatures | undefined | null;
  error?: Error | null;
  children: ReactNode;
}

export function AppShell({
  isLoggedIn,
  email,
  locals,
  features,
  error,
  children,
}: Readonly<AppShellProps>) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isLoggedIn == null) return;
    const isPricingRoute = pathname === '/pricing';
    const shouldShowAds =
      !isLoggedIn &&
      !isPricingRoute &&
      !isEmbeddedAppWebView(navigator.userAgent);
    if (shouldShowAds) {
      injectAdSenseScript();
    } else {
      removeAdSenseScript();
    }
  }, [isLoggedIn, pathname]);

  const onLogOut = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();
    get2ankiApi().logout();
  };

  const useSidebar = isLoggedIn === true && !shouldForceTopBar(pathname);

  if (useSidebar) {
    return (
      <SidebarLayout
        email={email}
        locals={locals}
        features={features}
        onLogOut={onLogOut}
        error={error}
      >
        {children}
      </SidebarLayout>
    );
  }

  return (
    <PageLayout error={error} isLoggedIn={isLoggedIn}>
      {children}
    </PageLayout>
  );
}
