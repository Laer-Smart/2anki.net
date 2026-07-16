import React, { type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../../styles/shared.module.css';
import { isDomManipulationError } from '../../lib/isDomManipulationError';

function DomRecoveryFallback({ onReload }: Readonly<{ onReload: () => void }>) {
  const { t } = useTranslation('errors');
  return (
    <main className={styles.pageNarrow}>
      <section className={styles.card} role="alert" aria-live="assertive">
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>{t('domRecovery.title')}</h1>
          <p className={styles.subtitle}>{t('domRecovery.subtitle')}</p>
        </header>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btnPrimary} ${styles.btnInline}`}
            onClick={onReload}
          >
            {t('domRecovery.reload')}
          </button>
        </div>
      </section>
    </main>
  );
}

type DomRecoveryBoundaryProps = Readonly<{
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRecover?: (error: Error) => void;
  reloadPage?: () => void;
}>;

type DomRecoveryBoundaryState = {
  error: Error | null;
  remountCount: number;
};

export const MAX_REMOUNTS = 1;

export function shouldRemount(error: Error, remountCount: number): boolean {
  return isDomManipulationError(error) && remountCount < MAX_REMOUNTS;
}

export class DomRecoveryBoundary extends React.Component<
  DomRecoveryBoundaryProps,
  DomRecoveryBoundaryState
> {
  state: DomRecoveryBoundaryState = {
    error: null,
    remountCount: 0,
  };

  static getDerivedStateFromError(
    error: Error
  ): Partial<DomRecoveryBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);

    if (shouldRemount(error, this.state.remountCount)) {
      this.props.onRecover?.(error);
      this.setState((prev) => ({
        error: null,
        remountCount: prev.remountCount + 1,
      }));
    }
  }

  private readonly defaultReload = () => globalThis.location.reload();

  private readonly reloadPage = () => {
    (this.props.reloadPage ?? this.defaultReload)();
  };

  render() {
    if (this.state.error) {
      return <DomRecoveryFallback onReload={this.reloadPage} />;
    }

    return (
      <React.Fragment key={this.state.remountCount}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
