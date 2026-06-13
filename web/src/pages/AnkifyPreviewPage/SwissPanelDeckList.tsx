import { ReactElement } from 'react';
import styles from './SwissPanelDeckList.module.css';
import DotsHorizontal from '../../components/icons/DotsHorizontal';

export type DeckStatus = 'running' | 'syncing' | 'error' | 'offline';

export interface SwissPanelDeck {
  id: string;
  title: string;
  url?: string;
  deckPath: string;
  status: DeckStatus;
  syncedAgo?: string;
  backlog?: number;
  message?: string;
  menuOpen?: boolean;
}

interface Props {
  decks: SwissPanelDeck[];
}

const dotClass: Record<DeckStatus, string> = {
  running: styles.dotRunning,
  syncing: styles.dotSyncing,
  error: styles.dotError,
  offline: styles.dotOffline,
};

const renderName = (deck: SwissPanelDeck): ReactElement => {
  if (deck.url != null && deck.url.length > 0) {
    return (
      <a href={deck.url} target="_blank" rel="noreferrer">
        {deck.title}
      </a>
    );
  }
  return <>{deck.title}</>;
};

const renderData = (deck: SwissPanelDeck): ReactElement => (
  <span className={styles.data}>
    <span className={styles.dataPath}>{deck.deckPath}</span>
    {deck.status === 'syncing' ? (
      <span>syncing…</span>
    ) : (
      deck.syncedAgo != null && <span>{deck.syncedAgo}</span>
    )}
    <span className={styles.dataBacklog}>
      {deck.backlog == null ? '▲—' : `▲${deck.backlog}`}
    </span>
  </span>
);

const SwissPanelDeckList = ({ decks }: Props): ReactElement => (
  <div className={styles.panel}>
    <div className={styles.bar}>
      <span className={styles.barDot} aria-hidden="true" />
      <span>Anki running</span>
    </div>
    <div className={styles.heading}>
      <h2 className={styles.headingTitle}>Decks</h2>
      <span className={styles.cadence}>Checks Notion every 5 minutes</span>
    </div>
    {decks.length === 0 ? (
      <p className={styles.empty}>
        No synced decks yet. Pick a Notion page to keep in sync with Anki.
      </p>
    ) : (
      <ul className={styles.list}>
        {decks.map((deck) => (
          <li key={deck.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span
                className={`${styles.dot} ${dotClass[deck.status]}`}
                aria-hidden="true"
              />
              <span className={styles.name} title={deck.title}>
                {renderName(deck)}
              </span>
              {renderData(deck)}
              <button
                type="button"
                className={styles.menuTrigger}
                aria-label={`Options for ${deck.title}`}
              >
                <DotsHorizontal width={16} height={16} />
              </button>
            </div>
            {deck.menuOpen === true && (
              <div className={styles.menu} role="menu">
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                >
                  Update now
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                >
                  Set deck location
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                >
                  Stop syncing
                </button>
              </div>
            )}
            {deck.status === 'error' && deck.message != null && (
              <p className={`${styles.subline} ${styles.sublineError}`}>
                {deck.message}
              </p>
            )}
            {deck.status === 'offline' && deck.message != null && (
              <p className={`${styles.subline} ${styles.sublineOffline}`}>
                {deck.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default SwissPanelDeckList;
