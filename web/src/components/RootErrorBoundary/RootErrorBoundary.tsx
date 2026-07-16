import React, { type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../../styles/shared.module.css';
import { isChunkLoadError, recoverFromChunkError } from '../../lib/chunkReload';

type RootErrorFallbackProps = Readonly<{
  chunkLoad: boolean;
  resetFailed: boolean;
  onReload: () => void;
  onResetLocalData: () => void;
}>;

function RootErrorFallback({
  chunkLoad,
  resetFailed,
  onReload,
  onResetLocalData,
}: RootErrorFallbackProps) {
  const { t } = useTranslation('errors');
  const title = chunkLoad
    ? t('rootBoundary.chunkTitle')
    : t('rootBoundary.genericTitle');
  const subtitle = chunkLoad
    ? t('rootBoundary.chunkSubtitle')
    : t('rootBoundary.genericSubtitle');

  return (
    <main className={styles.pageNarrow}>
      <section className={styles.card} role="alert" aria-live="assertive">
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        {resetFailed && (
          <p className={styles.notificationDanger}>
            {t('rootBoundary.resetFailed')}
          </p>
        )}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btnPrimary} ${styles.btnInline}`}
            onClick={onReload}
          >
            {t('rootBoundary.reload')}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onResetLocalData}
          >
            {t('rootBoundary.resetLocalData')}
          </button>
        </div>
      </section>
    </main>
  );
}

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
      return (
        <RootErrorFallback
          chunkLoad={this.state.chunkLoad}
          resetFailed={this.state.resetFailed}
          onReload={this.reloadPage}
          onResetLocalData={this.resetLocalData}
        />
      );
    }

    return this.props.children;
  }
}
