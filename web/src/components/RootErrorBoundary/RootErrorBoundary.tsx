import React, { type ErrorInfo, type ReactNode } from 'react';

import styles from '../../styles/shared.module.css';
import { isChunkLoadError, recoverFromChunkError } from '../../lib/chunkReload';

type RootErrorBoundaryProps = Readonly<{
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  reloadPage?: () => void;
}>;

type RootErrorBoundaryState = {
  error: Error | null;
  resetFailed: boolean;
  chunkLoad: boolean;
  reloading: boolean;
};

export class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = {
    error: null,
    resetFailed: false,
    chunkLoad: false,
    reloading: false,
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      error,
      resetFailed: false,
      chunkLoad: isChunkLoadError(error),
      reloading: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const triggered = recoverFromChunkError(error);
    if (triggered) {
      this.setState({ reloading: true });
      return;
    }
    this.props.onError?.(error, errorInfo);
  }

  private readonly defaultReload = () => window.location.reload();

  private readonly reloadPage = () => {
    (this.props.reloadPage ?? this.defaultReload)();
  };

  private readonly resetLocalData = () => {
    try {
      window.localStorage.clear();
    } catch {
      this.setState({ resetFailed: true });
      return;
    }

    this.reloadPage();
  };

  render() {
    if (this.state.reloading) {
      return null;
    }

    if (this.state.error) {
      if (this.state.chunkLoad) {
        return (
          <main className={styles.pageNarrow}>
            <section className={styles.card} role="alert" aria-live="assertive">
              <header className={styles.pageHeader}>
                <h1 className={styles.title}>
                  This page was updated while you had it open
                </h1>
                <p className={styles.subtitle}>
                  Reload to load the latest version. If reload doesn't help,
                  reset local data and reload.
                </p>
              </header>

              {this.state.resetFailed && (
                <p className={styles.notificationDanger}>
                  Couldn't reset local data. Clear site data for 2anki in your
                  browser settings, then reload.
                </p>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btnPrimary} ${styles.btnInline}`}
                  onClick={this.reloadPage}
                >
                  Reload
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={this.resetLocalData}
                >
                  Reset local data
                </button>
              </div>
            </section>
          </main>
        );
      }

      return (
        <main className={styles.pageNarrow}>
          <section className={styles.card} role="alert" aria-live="assertive">
            <header className={styles.pageHeader}>
              <h1 className={styles.title}>
                Something went wrong loading 2anki
              </h1>
              <p className={styles.subtitle}>
                Try reloading. If that doesn't help, reset local data and
                reload.
              </p>
            </header>

            {this.state.resetFailed && (
              <p className={styles.notificationDanger}>
                Couldn't reset local data. Clear site data for 2anki in your
                browser settings, then reload.
              </p>
            )}

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnInline}`}
                onClick={this.reloadPage}
              >
                Reload
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={this.resetLocalData}
              >
                Reset local data
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
