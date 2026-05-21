import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';

import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';

import App from './App';

import { SkeletonPage } from './components/Skeleton/Skeleton';
import { RootErrorBoundary } from './components/RootErrorBoundary/RootErrorBoundary';
import { initTheme } from './lib/theme';
import { recoverFromChunkError } from './lib/chunkReload';

window.addEventListener('error', (event) => {
  recoverFromChunkError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  recoverFromChunkError(event.reason);
});

function main() {
  initTheme();
  Bugsnag.start({
    apiKey: '746833cc883014579ab94b5d1222c638',
    plugins: [new BugsnagPluginReact()],
    enabledReleaseStages: ['production'],
  });

  const ErrorBoundary = Bugsnag.getPlugin('react')!.createErrorBoundary(React);

  const container = document.getElementById('root');
  const root = createRoot(container!);

  root.render(
    <React.StrictMode>
      <Suspense fallback={<SkeletonPage />}>
        <ErrorBoundary>
          <RootErrorBoundary
            onError={(error, errorInfo) =>
              Bugsnag.notify(error, (event) =>
                event.addMetadata('react', {
                  componentStack: errorInfo.componentStack,
                })
              )
            }
          >
            <App />
          </RootErrorBoundary>
        </ErrorBoundary>
      </Suspense>
    </React.StrictMode>
  );
}

main();
