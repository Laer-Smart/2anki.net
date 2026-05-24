import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';

import App from './App';

import { SkeletonPage } from './components/Skeleton/Skeleton';
import { RootErrorBoundary } from './components/RootErrorBoundary/RootErrorBoundary';
import { initTheme } from './lib/theme';
import { recoverFromChunkError } from './lib/chunkReload';
import { reportClientError } from './lib/reportClientError';

window.addEventListener('error', (event) => {
  recoverFromChunkError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  recoverFromChunkError(event.reason);
});

function main() {
  initTheme();

  const container = document.getElementById('root');
  const root = createRoot(container!);

  root.render(
    <React.StrictMode>
      <Suspense fallback={<SkeletonPage />}>
        <RootErrorBoundary
          onError={(error, errorInfo) =>
            reportClientError(error, {
              componentStack: errorInfo.componentStack,
            })
          }
        >
          <App />
        </RootErrorBoundary>
      </Suspense>
    </React.StrictMode>
  );
}

main();
