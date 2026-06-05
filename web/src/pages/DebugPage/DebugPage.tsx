import { useState } from 'react';
import { getKeys } from './helpers/getKeys';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import styles from '../../styles/shared.module.css';
import debugStyles from './DebugPage.module.css';

const SHARE_FILES_KEY = 'share-files-for-debugging';

interface UserLocalsShape {
  user?: { id?: number };
  locals?: {
    patreon?: boolean;
    subscriber?: boolean;
    subscriptionInfo?: { active?: boolean };
  };
}

function getPlanLabel(locals: UserLocalsShape['locals']): string {
  if (locals?.patreon) return 'Lifetime (Patreon)';
  if (locals?.subscriber || locals?.subscriptionInfo?.active) {
    return 'Active subscriber';
  }
  return 'Free';
}

function KeyValueTableHead() {
  return (
    <thead className={debugStyles.visuallyHidden}>
      <tr>
        <th scope="col">Key</th>
        <th scope="col">Value</th>
      </tr>
    </thead>
  );
}

function UserLocalsCard({ data }: Readonly<{ data: unknown }>) {
  const shape =
    data && typeof data === 'object' ? (data as UserLocalsShape) : null;
  const userId = shape?.user?.id ?? null;
  const plan = shape ? getPlanLabel(shape.locals) : null;
  return (
    <section className={debugStyles.dataCard}>
      <header className={debugStyles.dataCardHeader}>User Locals</header>
      {userId == null ? (
        <div className={debugStyles.dataEmpty}>Not signed in</div>
      ) : (
        <table className={debugStyles.dataTable}>
          <KeyValueTableHead />
          <tbody>
            <tr>
              <td className={debugStyles.dataKey}>user id</td>
              <td className={debugStyles.dataValue}>{userId}</td>
            </tr>
            <tr>
              <td className={debugStyles.dataKey}>plan</td>
              <td className={debugStyles.dataValue}>{plan}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function LocalStorageCard({
  highlightKey,
}: Readonly<{ highlightKey: string }>) {
  const keys = getKeys(localStorage);
  return (
    <section className={debugStyles.dataCard}>
      <header className={debugStyles.dataCardHeader}>
        <span>Local Storage</span>
        <span className={debugStyles.dataCardCount}>{keys.length}</span>
      </header>
      {keys.length === 0 ? (
        <div className={debugStyles.dataEmpty}>Empty</div>
      ) : (
        <table className={debugStyles.dataTable}>
          <KeyValueTableHead />
          <tbody>
            {keys.map((key) => (
              <tr
                key={key}
                className={
                  key === highlightKey
                    ? debugStyles.dataRowHighlight
                    : undefined
                }
              >
                <td className={debugStyles.dataKey}>{key}</td>
                <td className={debugStyles.dataValue}>
                  {localStorage.getItem(key) ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function DebugPage() {
  const [show, setShow] = useState(false);
  const [shareFiles, setShareFiles] = useState(
    localStorage.getItem(SHARE_FILES_KEY) === 'true'
  );
  const { data } = useUserLocals();

  const resetLocalStorage = () => {
    localStorage.clear();
    globalThis.location.reload();
  };

  const toggleShareFiles = () => {
    const next = !shareFiles;
    setShareFiles(next);
    localStorage.setItem(SHARE_FILES_KEY, String(next));
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Debug page</h1>

      <section className={debugStyles.shareCard}>
        <div className={debugStyles.shareHeader}>
          <span className={debugStyles.shareBadge}>Opt-in</span>
          <span>Help us fix bugs faster</span>
        </div>
        <p className={debugStyles.shareDescription}>
          When a conversion fails, enabling this sends the uploaded files and
          error details to the 2anki team so we can reproduce and fix the issue.
          It is <strong>off by default</strong> to keep your notes private. Turn
          it on before filing a bug report so your next failed upload reaches
          us.
        </p>
        <div className={debugStyles.shareControls}>
          <label className={debugStyles.shareToggle}>
            <input
              type="checkbox"
              checked={shareFiles}
              onChange={toggleShareFiles}
            />
            <span>Share files when a conversion fails</span>
          </label>
          <span
            className={`${debugStyles.shareStatus} ${
              shareFiles
                ? debugStyles.shareStatusOn
                : debugStyles.shareStatusOff
            }`}
          >
            {shareFiles
              ? 'On — files will be sent on failure'
              : 'Off — nothing is sent'}
          </span>
        </div>
      </section>

      <UserLocalsCard data={data} />
      <LocalStorageCard highlightKey={SHARE_FILES_KEY} />
      <div className={styles.debugActions}>
        <button
          className={styles.btnOutline}
          type="button"
          onClick={() => setShow(!show)}
        >
          {show ? 'Hide' : 'Show'}
        </button>
        {show && <ErrorPresenter error={new Error('This is a test error')} />}
        <button
          className={styles.btnOutline}
          type="button"
          onClick={resetLocalStorage}
        >
          Reset local storage
        </button>
      </div>
    </div>
  );
}
