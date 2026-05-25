import { ReactElement } from 'react';
import sharedStyles from '../../styles/shared.module.css';
import previewStyles from '../AccountPreviewPage/AccountPreviewPage.module.css';
import homeStyles from '../HomePage/HomePage.module.css';

interface Candidate {
  label: string;
  note: string;
  headline: string;
  subhead: ReactElement;
  live?: boolean;
}

const candidates: Candidate[] = [
  {
    label: 'Variant A — fidelity-led (recommended, live)',
    note: 'Leads with the moat, names Notion first. This is the headline shipped on the live homepage.',
    headline: 'Flashcards that work in Anki',
    live: true,
    subhead: (
      <>
        Drop a Notion page and get a deck you don&apos;t have to fix — proper
        cloze, atomic cards, the right note types. PDF, Quizlet, Markdown, HTML,
        and CSV too.
      </>
    ),
  },
  {
    label: 'Variant B — moat-as-claim',
    note: 'States the moat as the headline claim, formats in the subhead.',
    headline: 'The converter whose decks you don’t have to fix',
    subhead: (
      <>
        Notion, PDF, and more in, clean Anki cards out — cloze, atomic cards,
        and note types done right.
      </>
    ),
  },
  {
    label: 'Variant C — Notion-forward',
    note: 'Leads with the Notion query verbatim, fidelity in the subhead.',
    headline: 'Notion to Anki, done right',
    subhead: (
      <>
        A deck you can study the moment it lands — correct cloze, atomic cards,
        and note types. PDF, Quizlet, Markdown, HTML, and CSV too.
      </>
    ),
  },
];

function HeroPreview({ candidate }: Readonly<{ candidate: Candidate }>) {
  return (
    <section className={homeStyles.hero}>
      <h1 className={homeStyles.heroTitle}>{candidate.headline}</h1>
      <p className={homeStyles.heroSubtitle}>{candidate.subhead}</p>
    </section>
  );
}

export default function HomePreviewPage() {
  return (
    <div className={previewStyles.outer}>
      <header className={previewStyles.outerHeader}>
        <h1 className={sharedStyles.title}>/home hero — variants</h1>
        <p className={sharedStyles.subtitle}>
          Visual preview only. Not linked from navigation. Not gated by auth.
          Pick the live headline here, then ship it as the production hero.
        </p>
      </header>

      <div className={previewStyles.grid}>
        {candidates.map((candidate) => (
          <article key={candidate.label} className={previewStyles.variant}>
            <header className={previewStyles.variantHeader}>
              <h2 className={previewStyles.variantLabel}>{candidate.label}</h2>
              <p className={previewStyles.variantNote}>{candidate.note}</p>
            </header>
            <div className={previewStyles.frame}>
              <HeroPreview candidate={candidate} />
            </div>
          </article>
        ))}

        <article className={previewStyles.variant}>
          <header className={previewStyles.variantHeader}>
            <h2 className={previewStyles.variantLabel}>
              Testimonial slot — placeholder
            </h2>
            <p className={previewStyles.variantNote}>
              Reserved for 1&ndash;2 real, sourced quotes. Production ships
              empty until Al supplies real quotes. No fabricated names or
              quotes.
            </p>
          </header>
          <div className={previewStyles.frame}>
            <div className={previewStyles.placeholder}>
              Testimonial slot — awaiting a real, sourced quote
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
