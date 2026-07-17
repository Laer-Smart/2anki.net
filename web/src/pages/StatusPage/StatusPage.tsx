import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

function relativeFromMs(ms: number | null, t: TFunction): string {
  if (ms == null) return t('status.noData');
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  if (minutes < 1) return t('status.momentAgo');
  if (minutes < 60) return t('status.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('status.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('status.daysAgo', { count: days });
}

function relativeFromIso(iso: string | null, t: TFunction): string {
  if (iso == null) return t('status.noData');
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return t('status.noData');
  return relativeFromMs(ms, t);
}

function dotClass(ok: boolean | null): string {
  if (ok == null) return pageStyles.dotGray;
  return ok ? pageStyles.dotGreen : pageStyles.dotRed;
}

export default function StatusPage() {
  const { t } = useTranslation('marketing');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as StatusPayload;
          setStatus(data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('status.title')}</h1>

      {error && (
        <p className={pageStyles.fallback}>
          {t('status.fallbackPrefix')}
          <a
            href="https://www.reddit.com/r/notion2anki/"
            target="_blank"
            rel="noreferrer"
          >
            r/notion2anki
          </a>
          {t('status.fallbackSuffix')}
        </p>
      )}

      {status && (
        <>
          <section className={pageStyles.section}>
            <h2>{t('status.services')}</h2>
            <div className={`${pageStyles.signalRow}`}>
              <span
                className={`${pageStyles.dot} ${dotClass(status.api.ok)}`}
                aria-hidden="true"
              />
              <span className={pageStyles.label}>{t('status.api')}</span>
              <span>
                {status.api.ok ? t('status.operational') : t('status.degraded')}
              </span>
            </div>
            <div className={pageStyles.signalRow}>
              <span
                className={`${pageStyles.dot} ${dotClass(status.db.ok)}`}
                aria-hidden="true"
              />
              <span className={pageStyles.label}>{t('status.database')}</span>
              <span>
                {status.db.ok
                  ? t('status.operational')
                  : t('status.unreachable')}
              </span>
            </div>
            <div className={pageStyles.signalRow}>
              <span
                className={`${pageStyles.dot} ${dotClass(status.notion.ok)}`}
                aria-hidden="true"
              />
              <span className={pageStyles.label}>{t('status.notionApi')}</span>
              <span>
                {status.notion.ok
                  ? t('status.active')
                  : t('status.noRecentCalls')}
              </span>
              {status.notion.lastSuccessAt != null && (
                <span className={pageStyles.meta}>
                  {t('status.lastCall', {
                    time: relativeFromMs(status.notion.lastSuccessAt, t),
                  })}
                </span>
              )}
            </div>
            <div className={pageStyles.signalRow}>
              <span
                className={`${pageStyles.dot} ${status.stripe.lastWebhookAt == null ? pageStyles.dotGray : pageStyles.dotGreen}`}
                aria-hidden="true"
              />
              <span className={pageStyles.label}>
                {t('status.stripeWebhooks')}
              </span>
              <span>
                {status.stripe.lastWebhookAt == null
                  ? t('status.noWebhook')
                  : t('status.lastReceived', {
                      time: relativeFromMs(status.stripe.lastWebhookAt, t),
                    })}
              </span>
            </div>
          </section>

          {status.lastDeploy.time != null && (
            <section className={pageStyles.section}>
              <h2>{t('status.lastDeploy')}</h2>
              <div className={pageStyles.signalRow}>
                <span className={pageStyles.label}>{t('status.updated')}</span>
                <span>{relativeFromIso(status.lastDeploy.time, t)}</span>
              </div>
            </section>
          )}

          {status.incidents.length > 0 && (
            <section className={pageStyles.section}>
              <h2>{t('status.recentIncidents')}</h2>
              {status.incidents.map((incident) => (
                <div key={incident.id} className={pageStyles.incident}>
                  <p className={pageStyles.incidentSummary}>
                    {incident.summary}
                  </p>
                  <p className={pageStyles.incidentTime}>
                    {t('status.started', {
                      time: relativeFromIso(incident.start, t),
                    })}
                    {incident.end == null ? (
                      <>
                        {' '}
                        &mdash;{' '}
                        <span className={pageStyles.incidentOpen}>
                          {t('status.ongoing')}
                        </span>
                      </>
                    ) : (
                      <>
                        {' '}
                        &mdash;{' '}
                        {t('status.resolved', {
                          time: relativeFromIso(incident.end, t),
                        })}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {!status && !error && (
        <p className={pageStyles.fallback}>{t('status.checking')}</p>
      )}
    </div>
  );
}
