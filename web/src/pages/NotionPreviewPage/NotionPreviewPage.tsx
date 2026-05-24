import { ReactElement } from 'react';
import sharedStyles from '../../styles/shared.module.css';
import searchStyles from '../SearchPage/SearchPage.module.css';
import previewStyles from '../AccountPreviewPage/AccountPreviewPage.module.css';
import ConnectNotion from '../SearchPage/components/ConnectNotion';
import SearchBar from '../SearchPage/components/SearchBar';
import SearchObjectEntry from '../SearchPage/components/SearchObjectEntry';
import { SkeletonList } from '../../components/Skeleton/Skeleton';

const noopFavorites = () => {};
const noopError = () => {};

interface Variant {
  label: string;
  note: string;
  render: () => ReactElement;
}

const variants: Variant[] = [
  {
    label: 'Connected — Notion workspace linked',
    note: 'Header + quiet workspace caption + search bar. Each row has one blue primary (Convert) and three dimmed secondary affordances that brighten on hover.',
    render: () => (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Notion</h1>
          <p className={sharedStyles.subtitle}>
            Find a page and convert it into an Anki deck.
          </p>
        </header>
        <div className={searchStyles.workspaceLine}>
          <span className={searchStyles.workspaceDot} />
          <span className={searchStyles.workspaceName}>
            Alexander&apos;s Workspace
          </span>
          <a href="#preview" className={searchStyles.workspaceSwitch}>
            Switch workspace
          </a>
        </div>
        <div className={searchStyles.stickyBar}>
          <SearchBar
            value=""
            inProgress={false}
            onSearchClicked={() => {}}
            onSearchQueryChanged={() => {}}
          />
        </div>
        <SearchObjectEntry
          isFavorite={false}
          title="Organic Chemistry — Ch. 4"
          icon={undefined}
          url="https://notion.so/preview-1"
          id="preview-1"
          type="page"
          setFavorites={noopFavorites}
          setError={noopError}
        />
        <SearchObjectEntry
          isFavorite={false}
          title="Pharmacology Week 7"
          icon={undefined}
          url="https://notion.so/preview-2"
          id="preview-2"
          type="page"
          setFavorites={noopFavorites}
          setError={noopError}
        />
        <SearchObjectEntry
          isFavorite={false}
          title="Daily flashcards"
          icon={undefined}
          url="https://notion.so/preview-3"
          id="preview-3"
          type="database"
          setFavorites={noopFavorites}
          setError={noopError}
        />
      </div>
    ),
  },
  {
    label: 'Searching — input pulses on the border',
    note: 'In-progress search shows a quiet border-pulse on the input, no separate text indicator.',
    render: () => (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Notion</h1>
          <p className={sharedStyles.subtitle}>
            Find a page and convert it into an Anki deck.
          </p>
        </header>
        <div className={searchStyles.workspaceLine}>
          <span className={searchStyles.workspaceDot} />
          <span className={searchStyles.workspaceName}>
            Alexander&apos;s Workspace
          </span>
          <a href="#preview" className={searchStyles.workspaceSwitch}>
            Switch workspace
          </a>
        </div>
        <div className={searchStyles.stickyBar}>
          <SearchBar
            value="organic"
            inProgress
            onSearchClicked={() => {}}
            onSearchQueryChanged={() => {}}
          />
        </div>
      </div>
    ),
  },
  {
    label: 'Not connected — empty state',
    note: 'One primary card. Upload is a quieter fallback row beneath, not a sibling card.',
    render: () => (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Get started</h1>
          <p className={sharedStyles.subtitle}>
            Connect your Notion workspace or upload files to create Anki decks.
          </p>
        </header>
        <ConnectNotion ready connectionLink="#preview" />
      </div>
    ),
  },
  {
    label: 'Loading — initial workspace fetch',
    note: 'Skeleton list while useNotionData resolves.',
    render: () => (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Get started</h1>
          <p className={sharedStyles.subtitle}>
            Connect your Notion workspace or upload files to create Anki decks.
          </p>
        </header>
        <SkeletonList count={5} />
      </div>
    ),
  },
];

export default function NotionPreviewPage() {
  return (
    <div className={previewStyles.outer}>
      <header className={previewStyles.outerHeader}>
        <h1 className={sharedStyles.title}>/notion — variants</h1>
        <p className={sharedStyles.subtitle}>
          Visual preview only. Not linked from navigation. Not gated by auth.
        </p>
      </header>

      <div className={previewStyles.grid}>
        {variants.map((variant) => (
          <article key={variant.label} className={previewStyles.variant}>
            <header className={previewStyles.variantHeader}>
              <h2 className={previewStyles.variantLabel}>{variant.label}</h2>
              <p className={previewStyles.variantNote}>{variant.note}</p>
            </header>
            <div className={previewStyles.frame}>
              <div>{variant.render()}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
