import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import {
  ApiKeySummary,
  CreatedApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  requestDeveloperAccess,
} from '../../lib/backend/developerKeys';
import sharedStyles from '../../styles/shared.module.css';
import styles from './DevelopersPage.module.css';

function formatLastUsed(value: string | null): string {
  if (value == null) return 'Never used';
  const date = new Date(value);
  return `Used ${date.toLocaleDateString()}`;
}

function LockedState() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [message, setMessage] = useState('');

  const request = async () => {
    setStatus('sending');
    try {
      await requestDeveloperAccess();
      setStatus('sent');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something broke.');
    }
  };

  return (
    <section className={sharedStyles.sectionCard}>
      <h2 className={styles.cardTitle}>Developer access</h2>
      <p className={styles.body}>
        The developer API and CLI are under development and invite-only. Use an
        API key to convert from your own tools — a script, a cron job, or an MCP
        client. Access is open to lifetime accounts; everyone else can request
        it.
      </p>
      {status === 'sent' ? (
        <p className={styles.noticeSuccess}>
          Request sent. We&rsquo;ll be in touch by email.
        </p>
      ) : (
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={request}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Sending' : 'Request access'}
        </button>
      )}
      {status === 'error' && <p className={styles.noticeDanger}>{message}</p>}
    </section>
  );
}

function RevealDialog({
  created,
  onDone,
}: Readonly<{ created: CreatedApiKey; onDone: () => void }>) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(created.secret);
    setCopied(true);
  };
  return (
    <div className={styles.revealBackdrop}>
      <div className={styles.revealCard} role="dialog" aria-modal="true">
        <h3 className={styles.cardTitle}>Copy your API key</h3>
        <p className={styles.noticeDanger}>
          This is the only time you&rsquo;ll see this key. Copy it now and store
          it somewhere safe — you won&rsquo;t be able to see it again.
        </p>
        <div className={styles.keyReveal} data-hj-suppress>
          <code className={styles.keyValue}>{created.secret}</code>
          <button
            type="button"
            className={sharedStyles.btnSecondary}
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function KeyManager() {
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [reveal, setReveal] = useState<CreatedApiKey | null>(null);

  const refresh = () => {
    listApiKeys()
      .then(setKeys)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Could not load your keys.')
      );
  };

  useEffect(refresh, []);

  const create = async () => {
    if (name.trim().length === 0) return;
    setCreating(true);
    setError('');
    try {
      const created = await createApiKey(name.trim());
      setReveal(created);
      setName('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the key.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: number, keyName: string) => {
    if (
      !globalThis.confirm(
        `Revoke ${keyName}? Anything using it stops working right away. This can't be undone.`
      )
    ) {
      return;
    }
    try {
      await revokeApiKey(id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke the key.');
    }
  };

  return (
    <section className={sharedStyles.sectionCard}>
      <h2 className={styles.cardTitle}>API keys</h2>
      <p className={styles.body}>
        Use an API key to convert from your own tools — a script, a cron job, or
        an MCP client. Keep it secret; anyone with the key can convert on your
        account.
      </p>

      <div className={styles.createRow}>
        <input
          type="text"
          aria-label="Key name"
          placeholder="CLI on my laptop"
          className={styles.textInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={create}
          disabled={creating || name.trim().length === 0}
        >
          {creating ? 'Creating' : 'Create key'}
        </button>
      </div>

      {error !== '' && <p className={styles.noticeDanger}>{error}</p>}

      {keys != null && keys.length === 0 && (
        <p className={styles.body}>
          No API keys yet. Create one to convert from your own tools.
        </p>
      )}

      {keys != null && keys.length > 0 && (
        <ul className={styles.keyList}>
          {keys.map((key) => (
            <li key={key.id} className={styles.keyRow}>
              <div>
                <span className={styles.keyName}>{key.name}</span>
                <span className={styles.keyMeta} data-hj-suppress>
                  {key.prefix}… · {formatLastUsed(key.last_used_at)}
                </span>
              </div>
              <button
                type="button"
                className={styles.revokeButton}
                onClick={() => revoke(key.id, key.name)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {reveal != null && (
        <RevealDialog created={reveal} onDone={() => setReveal(null)} />
      )}
    </section>
  );
}

const RELEVANT_ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/upload/file',
    label: 'Convert a file into a deck',
  },
  { method: 'GET', path: '/api/upload/jobs', label: 'Check conversion status' },
  {
    method: 'GET',
    path: '/api/apkg/:key/meta',
    label: 'Deck preview — counts and decks',
  },
  { method: 'GET', path: '/api/apkg/:key/cards', label: 'Rendered cards' },
];

const CLI_RELEASES_URL = 'https://github.com/2anki/server/releases/latest';

function ApiGuide() {
  return (
    <section className={sharedStyles.sectionCard}>
      <h2 className={styles.cardTitle}>Using the API</h2>
      <p className={styles.body}>
        Send your key as a bearer token:{' '}
        <code>Authorization: Bearer sk_live_…</code>. These are the endpoints a
        converter client needs.
      </p>
      <ul className={styles.endpointList}>
        {RELEVANT_ENDPOINTS.map((endpoint) => (
          <li key={endpoint.path} className={styles.endpointRow}>
            <code className={styles.endpoint}>
              <span className={styles.method}>{endpoint.method}</span>{' '}
              {endpoint.path}
            </code>
            <span className={styles.endpointLabel}>{endpoint.label}</span>
          </li>
        ))}
      </ul>
      <div className={styles.linkRow}>
        <a className={sharedStyles.btnSecondary} href="/api/docs">
          Full API docs
        </a>
        <a
          className={sharedStyles.btnSecondary}
          href={CLI_RELEASES_URL}
          target="_blank"
          rel="noreferrer"
        >
          Download the CLI
        </a>
      </div>
    </section>
  );
}

export default function DevelopersPage() {
  const { data, isLoading } = useUserLocals();
  const hasAccess =
    data?.locals?.patreon === true || data?.locals?.developer_access === true;

  return (
    <div className={sharedStyles.page}>
      <Helmet>
        <title>Developers — 2anki</title>
      </Helmet>
      <header className={sharedStyles.pageHeader}>
        <h1 className={styles.title}>Developers</h1>
        <p className={styles.body}>
          Convert with the 2anki API from your own tools. Under development.
        </p>
      </header>
      {isLoading ? (
        <p className={styles.body}>Loading</p>
      ) : hasAccess ? (
        <>
          <KeyManager />
          <ApiGuide />
        </>
      ) : (
        <LockedState />
      )}
    </div>
  );
}
