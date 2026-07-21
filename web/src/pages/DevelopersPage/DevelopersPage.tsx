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

const MCP_SERVER_URL = 'https://2anki.net/mcp';
const API_BASE_URL = 'https://2anki.net/api';
const CLI_RELEASES_URL = 'https://github.com/2anki/server/releases/latest';
const CLI_NPM_URL = 'https://www.npmjs.com/package/@2anki/cli';
const GITHUB_ISSUES_URL = 'https://github.com/2anki/server/issues';
const CONNECT_GUIDE_PATH = '/documentation/start-here/use-in-claude';

function formatLastUsed(value: string | null): string {
  if (value == null) return 'Never used';
  const date = new Date(value);
  return `Used ${date.toLocaleDateString()}`;
}

function CopyButton({
  text,
  label,
}: Readonly<{ text: string; label: string }>) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      className={styles.copyButton}
      onClick={copy}
      aria-label={label}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

const INSTALL_TABS = [
  { id: 'npx', command: 'npx @2anki/cli login' },
  { id: 'npm', command: 'npm install -g @2anki/cli' },
  { id: 'pnpm', command: 'pnpm add -g @2anki/cli' },
  { id: 'binary', command: null },
] as const;

type InstallTabId = (typeof INSTALL_TABS)[number]['id'];

function InstallStrip() {
  const [active, setActive] = useState<InstallTabId>('npx');
  const tab = INSTALL_TABS.find((t) => t.id === active) ?? INSTALL_TABS[0];

  return (
    <div className={styles.terminal}>
      <div
        className={styles.terminalTabs}
        role="group"
        aria-label="Install method"
      >
        {INSTALL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              t.id === active ? styles.terminalTabActive : styles.terminalTab
            }
            aria-pressed={t.id === active}
            onClick={() => setActive(t.id)}
          >
            {t.id}
          </button>
        ))}
      </div>
      {tab.command != null ? (
        <div className={styles.terminalLine}>
          <span className={styles.terminalPrompt} aria-hidden="true">
            $
          </span>
          <code className={styles.terminalCommand}>{tab.command}</code>
          <CopyButton text={tab.command} label={`Copy ${tab.id} command`} />
        </div>
      ) : (
        <div className={styles.terminalLine}>
          <a
            className={styles.terminalLink}
            href={CLI_RELEASES_URL}
            target="_blank"
            rel="noreferrer"
          >
            Download the CLI
          </a>
          <span className={styles.terminalNote}>
            macOS, Linux, and Windows binaries. On macOS, clear quarantine once:{' '}
            <code>xattr -d com.apple.quarantine ./2anki-macos-arm64</code>
          </span>
        </div>
      )}
    </div>
  );
}

function GetStarted() {
  return (
    <section className={sharedStyles.sectionCard}>
      <h2 className={styles.cardTitle}>Get started</h2>
      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepLabel}>Create an API key</span>
          <span className={styles.stepBody}>
            Below, under API keys. The key is shown once.
          </span>
        </li>
        <li className={styles.step}>
          <span className={styles.stepLabel}>Install the CLI and sign in</span>
          <InstallStrip />
        </li>
        <li className={styles.step}>
          <span className={styles.stepLabel}>Convert</span>
          <span className={styles.stepBody}>
            <code className={styles.inlineCode}>2anki convert notes.md</code>{' '}
            builds an Anki deck from your file and prints the download path.
          </span>
        </li>
      </ol>
    </section>
  );
}

function McpCard() {
  return (
    <section className={sharedStyles.sectionCard}>
      <h2 className={styles.cardTitle}>Use 2anki in Claude or ChatGPT</h2>
      <p className={styles.body}>
        Add 2anki as a connector and build decks straight from a conversation.
        During the beta, connector access follows your developer access.
      </p>
      <div className={styles.urlRow}>
        <span className={styles.urlLabel}>Connector URL</span>
        <code className={styles.urlValue}>{MCP_SERVER_URL}</code>
        <CopyButton text={MCP_SERVER_URL} label="Copy connector URL" />
      </div>
      <a className={sharedStyles.btnSecondary} href={CONNECT_GUIDE_PATH}>
        How to connect
      </a>
    </section>
  );
}

function RequestAccessCard() {
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
        API keys and the connector are in a limited beta. Lifetime accounts have
        access already; everyone else can request it and accounts are enabled by
        email.
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
        Send the key as a bearer token. Keep it secret; anyone with the key can
        convert on your account.
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

function ApiGuide() {
  return (
    <section className={sharedStyles.sectionCard}>
      <h2 className={styles.cardTitle}>Using the API</h2>
      <p className={styles.body}>
        Send your key as a bearer token:{' '}
        <code className={styles.inlineCode}>
          Authorization: Bearer sk_live_…
        </code>
        . These are the endpoints a converter client needs.
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
      <a className={sharedStyles.btnSecondary} href="/api/docs">
        Full API docs
      </a>
      <p className={styles.contactNote}>
        Use case not covered, or need more access? Email{' '}
        <a href="mailto:support@2anki.net">support@2anki.net</a> — every message
        is read, and access is widened for real projects. Found a bug?{' '}
        <a href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">
          Open a GitHub issue
        </a>
        .
      </p>
    </section>
  );
}

const RAIL_FACTS: Array<{
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}> = [
  { label: 'API base', value: API_BASE_URL },
  { label: 'Auth', value: 'Bearer sk_live_…' },
  { label: 'MCP server', value: MCP_SERVER_URL },
  {
    label: 'CLI',
    value: '@2anki/cli',
    href: CLI_NPM_URL,
    external: true,
  },
  {
    label: 'Binaries',
    value: 'github releases',
    href: CLI_RELEASES_URL,
    external: true,
  },
  { label: 'API docs', value: '/api/docs', href: '/api/docs' },
  {
    label: 'Connect guide',
    value: 'use-in-claude',
    href: CONNECT_GUIDE_PATH,
  },
  {
    label: 'Bug reports',
    value: 'github issues',
    href: GITHUB_ISSUES_URL,
    external: true,
  },
  {
    label: 'Support',
    value: 'support@2anki.net',
    href: 'mailto:support@2anki.net',
  },
];

function SpecRail() {
  return (
    <aside className={styles.rail} aria-label="Connection facts">
      <div className={styles.railHeading}>Reference</div>
      <dl className={styles.railList}>
        {RAIL_FACTS.map((fact) => (
          <div key={fact.label} className={styles.railRow}>
            <dt className={styles.railLabel}>{fact.label}</dt>
            <dd className={styles.railValue}>
              {fact.href != null ? (
                <a
                  className={styles.railLink}
                  href={fact.href}
                  {...(fact.external === true
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  {fact.value}
                </a>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className={styles.railStatus}>
        <span className={styles.railStatusDot} aria-hidden="true" />
        API and connector in limited beta
      </div>
    </aside>
  );
}

export default function DevelopersPage() {
  const { data, isLoading } = useUserLocals();
  const hasAccess =
    data?.locals?.patreon === true || data?.locals?.developer_access === true;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Developers — 2anki</title>
      </Helmet>
      <header className={sharedStyles.pageHeader}>
        <h1 className={styles.title}>Developers</h1>
        <p className={styles.body}>
          Convert from your own tools — a script, the CLI, or an AI assistant.
        </p>
      </header>
      <div className={styles.layout}>
        <main className={styles.main}>
          <GetStarted />
          <McpCard />
          {isLoading ? (
            <p className={styles.body}>Loading</p>
          ) : hasAccess ? (
            <KeyManager />
          ) : (
            <RequestAccessCard />
          )}
          <ApiGuide />
        </main>
        <SpecRail />
      </div>
    </div>
  );
}
