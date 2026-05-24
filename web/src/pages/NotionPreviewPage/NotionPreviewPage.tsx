import { ReactElement } from 'react';
import sharedStyles from '../../styles/shared.module.css';
import searchStyles from '../SearchPage/SearchPage.module.css';
import previewStyles from '../AccountPreviewPage/AccountPreviewPage.module.css';

interface Variant {
  label: string;
  note: string;
  render: () => ReactElement;
}

const variants: Variant[] = [
  {
    label: 'Connected — Notion workspace linked',
    note: 'Header reads "Notion". Workspace badge with green dot + Switch link on the right.',
    render: () => (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Notion</h1>
          <p className={sharedStyles.subtitle}>
            Find a page and convert it into an Anki deck.
          </p>
        </header>
        <div className={searchStyles.workspaceLabel}>
          <span className={searchStyles.workspaceDot} />
          Alexander&apos;s Workspace
          <a href="#preview" className={searchStyles.workspaceSwitch}>
            Switch
          </a>
        </div>
        <div className={searchStyles.searchSurface}>
          <div className={previewStyles.placeholder}>
            Search input + page list renders here.
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Not connected — empty state',
    note: 'No workspace label. Header reads "Get started". ConnectNotion CTA is in place of the search list.',
    render: () => (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Get started</h1>
          <p className={sharedStyles.subtitle}>
            Connect your Notion workspace or upload files to create Anki decks.
          </p>
        </header>
        <div className={previewStyles.placeholder}>
          ConnectNotion card renders here (Connect to Notion / Upload a file two-up).
        </div>
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
        <div className={searchStyles.searchSurface}>
          <div className={previewStyles.placeholder}>
            SkeletonList placeholder.
          </div>
        </div>
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
