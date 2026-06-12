import React, { type ErrorInfo, type ReactNode } from 'react';

import styles from '../../styles/shared.module.css';
import { isDomManipulationError } from '../../lib/isDomManipulationError';

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
      return (
        <main className={styles.pageNarrow}>
          <section className={styles.card} role="alert" aria-live="assertive">
            <header className={styles.pageHeader}>
              <h1 className={styles.title}>Something went wrong</h1>
              <p className={styles.subtitle}>
                A browser extension may be interfering with this page. Reload to
                start over.
              </p>
            </header>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnInline}`}
                onClick={this.reloadPage}
              >
                Reload
              </button>
            </div>
          </section>
        </main>
      );
    }

    return (
      <React.Fragment key={this.state.remountCount}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
