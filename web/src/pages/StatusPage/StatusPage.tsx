import { useEffect, useState } from 'react';
import styles from '../../styles/shared.module.css';
import pageStyles from './StatusPage.module.css';

interface IncidentEntry {
  id: string;
  start: string;
  end: string | null;
  summary: string;
}

interface StatusPayload {
  api: { ok: boolean };
  db: { ok: boolean };
  notion: { ok: boolean; lastSuccessAt: number | null };
  stripe: { lastWebhookAt: number | null };
  lastDeploy: { sha: string | null; time: string | null };
  incidents: IncidentEntry[];
}

function formatRelative(ms: number | null): string {
  if (ms == null) return 'no data';
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'a moment ago';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function dotClass(ok: boolean | null): string {
  if (ok == null) return pageStyles.dotGray;
  return ok ? pageStyles.dotGreen : pageStyles.dotRed;
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as StatusPayload;
          setStatus(data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Status</h1>

      {error && (
        <p className={pageStyles.fallback}>
          API unreachable — check{' '}
          <a href="https://www.reddit.com/r/notion2anki/" target="_blank" rel="noreferrer">
            r/notion2anki
          </a>{' '}
          for community updates.
        </p>
      )}

      {status && (
        <>
          <section className={pageStyles.section}>
            <h2>Services</h2>
            <div className={`${pageStyles.signalRow}`}>
              <span className={`${pageStyles.dot} ${dotClass(status.api.ok)}`} aria-hidden="true" />
              <span className={pageStyles.label}>API</span>
              <span>{status.api.ok ? 'Operational' : 'Degraded'}</span>
            </div>
            <div className={pageStyles.signalRow}>
              <span className={`${pageStyles.dot} ${dotClass(status.db.ok)}`} aria-hidden="true" />
              <span className={pageStyles.label}>Database</span>
              <span>{status.db.ok ? 'Operational' : 'Unreachable'}</span>
            </div>
            <div className={pageStyles.signalRow}>
              <span className={`${pageStyles.dot} ${dotClass(status.notion.ok)}`} aria-hidden="true" />
              <span className={pageStyles.label}>Notion API</span>
              <span>{status.notion.ok ? 'Active' : 'No recent calls'}</span>
              {status.notion.lastSuccessAt != null && (
                <span className={pageStyles.meta}>
                  Last call {formatRelative(status.notion.lastSuccessAt)}
                </span>
              )}
            </div>
            <div className={pageStyles.signalRow}>
              <span
                className={`${pageStyles.dot} ${status.stripe.lastWebhookAt != null ? pageStyles.dotGreen : pageStyles.dotGray}`}
                aria-hidden="true"
              />
              <span className={pageStyles.label}>Stripe webhooks</span>
              <span>
                {status.stripe.lastWebhookAt != null
                  ? `Last received ${formatRelative(status.stripe.lastWebhookAt)}`
                  : 'No webhook received since last deploy'}
              </span>
            </div>
          </section>

          {status.lastDeploy.sha != null && (
            <section className={pageStyles.section}>
              <h2>Last deploy</h2>
              <div className={pageStyles.signalRow}>
                <span className={pageStyles.label}>Version</span>
                <span>{status.lastDeploy.sha.slice(0, 7)}</span>
                {status.lastDeploy.time != null && (
                  <span className={pageStyles.meta}>{status.lastDeploy.time}</span>
                )}
              </div>
            </section>
          )}

          {status.incidents.length > 0 && (
            <section className={pageStyles.section}>
              <h2>Recent incidents</h2>
              {status.incidents.map((incident) => (
                <div key={incident.id} className={pageStyles.incident}>
                  <p className={pageStyles.incidentSummary}>{incident.summary}</p>
                  <p className={pageStyles.incidentTime}>
                    Started {new Date(incident.start).toLocaleString()}
                    {incident.end == null ? (
                      <> &mdash; <span className={pageStyles.incidentOpen}>ongoing</span></>
                    ) : (
                      <> &mdash; resolved {new Date(incident.end).toLocaleString()}</>
                    )}
                  </p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {!status && !error && (
        <p className={pageStyles.fallback}>Checking services</p>
      )}
    </div>
  );
}
