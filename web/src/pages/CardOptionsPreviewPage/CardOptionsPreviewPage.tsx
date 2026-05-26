import { ReactElement, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import sharedStyles from '../../styles/shared.module.css';
import previewStyles from '../AccountPreviewPage/AccountPreviewPage.module.css';
import { ConfigureRow } from '../../components/CardOptionsForm/ConfigureRow';
import { CardSizeModal } from '../../components/CardOptionsForm/CardSizeModal';
import { McqModal } from '../../components/CardOptionsForm/McqModal';
import { FieldMappingModal } from '../../components/CardOptionsForm/FieldMappingModal';
import { UserInstructionsModal } from '../../components/CardOptionsForm/UserInstructionsModal';
import type { FieldMapping } from '../../lib/cardFields/types';

const noop = () => undefined;
const basicMapping: FieldMapping = {
  templateName: 'n2a-basic',
  fields: [
    { name: 'Front', instruction: 'The question or term' },
    { name: 'Back', instruction: 'The answer or definition' },
  ],
};

interface Variant {
  label: string;
  note: string;
  render: () => ReactElement;
}

function SectionRows({ subscriber }: Readonly<{ subscriber: boolean }>) {
  return (
    <div className={sharedStyles.page}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <ConfigureRow label="Card size" summary="Medium" onConfigure={noop} />
        <ConfigureRow
          label="Multiple choice"
          summary={subscriber ? 'On' : 'Off'}
          onConfigure={noop}
        />
        <ConfigureRow
          label="Field mapping"
          summary="n2a-basic"
          onConfigure={noop}
          badge={subscriber ? undefined : 'Premium'}
        />
        <ConfigureRow
          label="User instructions"
          summary="Default"
          onConfigure={noop}
          badge={subscriber ? undefined : 'Premium'}
        />
      </div>
    </div>
  );
}

const variants: Variant[] = [
  {
    label: 'Configure rows — subscriber (AI on)',
    note: 'Each AI sub-setting collapses to a row with a current-value summary and a Configure button.',
    render: () => <SectionRows subscriber />,
  },
  {
    label: 'Configure rows — free / anon (AI off)',
    note: 'Premium badge on gated rows; MCQ summary reads Off until enabled.',
    render: () => <SectionRows subscriber={false} />,
  },
  {
    label: 'Card size modal — Detailed',
    note: 'Segmented control plus per-size guidance. Done closes; the size saves live on change.',
    render: () => (
      <CardSizeModal isOpen onClose={noop} value="detailed" onChange={noop} />
    ),
  },
  {
    label: 'MCQ modal — On with read-aloud',
    note: 'Read-aloud voice pickers appear only when MCQ is on.',
    render: () => (
      <McqModal
        isOpen
        onClose={noop}
        enabled
        onEnabledChange={noop}
        ttsQuestion="en_US"
        ttsCorrectAnswer=""
        ttsExtra=""
        onTtsChange={noop}
      />
    ),
  },
  {
    label: 'MCQ modal — Off',
    note: 'Off state hides the read-aloud block.',
    render: () => (
      <McqModal
        isOpen
        onClose={noop}
        enabled={false}
        onEnabledChange={noop}
        ttsQuestion=""
        ttsCorrectAnswer=""
        ttsExtra=""
        onTtsChange={noop}
      />
    ),
  },
  {
    label: 'Field mapping modal',
    note: 'Per-field instructions for the AI, wrapped from the existing panel.',
    render: () => (
      <FieldMappingModal
        isOpen
        onClose={noop}
        mapping={basicMapping}
        onChange={noop}
      />
    ),
  },
  {
    label: 'User instructions modal',
    note: 'Free-form guidance sent to the AI for PDF conversion.',
    render: () => (
      <UserInstructionsModal
        isOpen
        onClose={noop}
        value="Focus on USMLE high-yield. Skip the introduction."
        onChange={noop}
      />
    ),
  },
];

export default function CardOptionsPreviewPage() {
  const [activeModal, setActiveModal] = useState<number | null>(null);

  return (
    <MemoryRouter>
      <div className={previewStyles.outer}>
        <header className={previewStyles.outerHeader}>
          <h1 className={sharedStyles.title}>/card-options — PDF &amp; AI variants</h1>
          <p className={sharedStyles.subtitle}>
            Visual preview only. Not linked from navigation. Not gated by auth.
          </p>
        </header>

        <div className={previewStyles.grid}>
          {variants.map((variant, index) => (
            <article key={variant.label} className={previewStyles.variant}>
              <header className={previewStyles.variantHeader}>
                <h2 className={previewStyles.variantLabel}>{variant.label}</h2>
                <p className={previewStyles.variantNote}>{variant.note}</p>
              </header>
              <div className={previewStyles.frame}>
                <button
                  type="button"
                  className={sharedStyles.btnSecondary}
                  onClick={() => setActiveModal(index)}
                  style={{ margin: '0 1rem 0.75rem' }}
                >
                  Open this variant
                </button>
                {activeModal === index && variant.render()}
              </div>
            </article>
          ))}
        </div>
      </div>
    </MemoryRouter>
  );
}
