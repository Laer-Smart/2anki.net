import ReactDOMServer from 'react-dom/server';
import React from 'react';
import { DownloadTitle } from '../components/download/DownloadTitle';
import DownloadDescription from '../components/download/DownloadDescription';
import DownloadList from '../components/download/DownloadList';
import { DownloadFooter } from '../components/download/DownloadFooter';
import { styles } from '../components/download/styles';
import { DownloadPageViewModel } from '../../controllers/DownloadController';

const STICKY_THRESHOLD = 8;

const globalCss = `
* { box-sizing: border-box; }
body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; }
a { color: inherit; }
a:hover { text-decoration: underline; }
.sticky-bar { position: sticky; top: 0; }
@media (max-width: 599px) {
  .sticky-bar { position: fixed; top: auto; bottom: 0; left: 0; right: 0; }
  .cta-button { display: block; width: 100%; text-align: center; }
}
`;

export const DownloadPage = ({
  id,
  sourceTitle,
  files,
  totalSizeBytes,
}: DownloadPageViewModel) => {
  const count = files.length;
  const hasFiles = count > 0;
  const showStickyBar = count >= STICKY_THRESHOLD;

  const deckWord = count === 1 ? 'deck' : 'decks';
  const title = hasFiles
    ? `${count} ${deckWord} ready — 2anki`
    : 'Your decks — 2anki';

  return ReactDOMServer.renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Download your Anki decks from 2anki.net"
        />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body style={styles.pageBackground}>
        {showStickyBar && (
          <div className="sticky-bar" style={styles.stickyBar}>
            <div style={styles.stickyBarInner}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                {count} decks
              </span>
              <a
                href={`/download/${id}/bulk`}
                style={{
                  ...styles.ctaButton,
                  padding: '6px 16px',
                  fontSize: '14px',
                }}
              >
                Download all ({count})
              </a>
            </div>
          </div>
        )}
        <div style={styles.container}>
          {hasFiles ? (
            <>
              <DownloadTitle count={count} />
              <DownloadDescription
                sourceTitle={sourceTitle}
                totalSizeBytes={totalSizeBytes}
              />
              <div style={styles.ctaRow}>
                <a
                  href={`/download/${id}/bulk`}
                  className="cta-button"
                  style={styles.ctaButton}
                >
                  Download all ({count})
                </a>
                <p style={styles.expiryLine}>
                  Available for 2 hours, then removed.
                </p>
              </div>
              <DownloadList files={files} id={id} />
            </>
          ) : (
            <>
              <h1 style={styles.h1}>No decks found in your upload</h1>
              <p style={{ color: '#64748b', fontSize: '15px' }}>
                Check that your file follows the formatting guidelines and try
                again.
              </p>
            </>
          )}
          <DownloadFooter />
        </div>
      </body>
    </html>
  );
};
