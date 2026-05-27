import { ReactNode, useState } from 'react';
import styles from './CardOptionsRedesign.module.css';
import {
  CardSizeModal,
  CardSizeValue,
} from '../../components/CardOptionsForm/CardSizeModal';
import { McqModal, McqTtsKey } from '../../components/CardOptionsForm/McqModal';
import { FieldMappingModal } from '../../components/CardOptionsForm/FieldMappingModal';
import { UserInstructionsModal } from '../../components/CardOptionsForm/UserInstructionsModal';
import type { FieldMapping } from '../../lib/cardFields/types';

type ToggleMode = 'open' | 'close';
type ModalKey = 'card-size' | 'mcq' | 'field-mapping' | 'user-instructions' | null;

const DEFAULT_MAPPING: FieldMapping = {
  templateName: 'specialstyle',
  fields: [
    { name: 'Front', instruction: 'The question, term, or concept being tested' },
    { name: 'Back', instruction: 'The answer, definition, or explanation' },
  ],
};

const DEFAULT_INSTRUCTIONS =
  'Read the document and create a card for every question and answer you find. Keep the original wording and language.';

function InfoIcon({ title }: Readonly<{ title: string }>) {
  return (
    <span className={styles.infoIcon} title={title}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
        <path d="M7 6v4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
        <circle cx="7" cy="4.25" r="0.625" fill="currentColor" />
      </svg>
    </span>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Switch({
  label,
  checked,
  onChange,
  disabled,
  trailing,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  trailing?: ReactNode;
}>) {
  return (
    <label
      className={`${styles.switchRow}${disabled ? ` ${styles.switchRowDisabled}` : ''}`}
    >
      <span className={styles.switch}>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.switchTrack} aria-hidden />
      </span>
      <span className={styles.switchLabel}>{label}</span>
      {trailing}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: Readonly<{
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (next: T) => void;
}>) {
  return (
    <fieldset className={styles.segmented}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${styles.segment}${value === o.value ? ` ${styles.segmentActive}` : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

function ConfigRow({
  label,
  summary,
  onConfigure,
}: Readonly<{ label: string; summary: string; onConfigure: () => void }>) {
  return (
    <div className={styles.configRow}>
      <div className={styles.configText}>
        <span className={styles.configLabel}>{label}</span>
        <span className={styles.configSummary}>{summary}</span>
      </div>
      <button
        type="button"
        className={styles.gear}
        aria-label={`Configure ${label}`}
        onClick={onConfigure}
      >
        <GearIcon />
      </button>
    </div>
  );
}

const SIZE_BACK: Record<CardSizeValue, string> = {
  short: 'Reviewing material at increasing intervals.',
  medium:
    'Reviewing material at increasing intervals so each review lands just before you would forget.',
  detailed:
    'A learning technique that schedules reviews at increasing intervals, timed to land just before you would forget — strengthening recall with the least total study time.',
};

export default function CardOptionsRedesign() {
  // Initial values mirror the product defaults (DEFAULT_TEMPLATE, DEFAULT_TOGGLE_MODE,
  // supportedOptions) so the preview reflects what a real account actually ships with.
  const [deckName, setDeckName] = useState('');
  const [cardStyle, setCardStyle] = useState('Special style');
  const [toggleMode, setToggleMode] = useState<ToggleMode>('close');
  const [cloze, setCloze] = useState(true);
  const [input, setInput] = useState(false);
  const [basicReversed, setBasicReversed] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [cardSize, setCardSize] = useState<CardSizeValue>('medium');
  const [aiOn, setAiOn] = useState(false);
  const [processPdfs, setProcessPdfs] = useState(true);
  const [extractText, setExtractText] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [cherry, setCherry] = useState(false);
  const [avocado, setAvocado] = useState(false);
  const [addNotionLink, setAddNotionLink] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [useNotionId, setUseNotionId] = useState(true);
  const [shareFiles, setShareFiles] = useState(false);

  const [openModal, setOpenModal] = useState<ModalKey>(null);
  const [mcqEnabled, setMcqEnabled] = useState(false);
  const [ttsQuestion, setTtsQuestion] = useState('');
  const [ttsCorrectAnswer, setTtsCorrectAnswer] = useState('');
  const [ttsExtra, setTtsExtra] = useState('');
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>(DEFAULT_MAPPING);
  const [userInstructions, setUserInstructions] = useState(DEFAULT_INSTRUCTIONS);

  const handleTts = (key: McqTtsKey, value: string) => {
    if (key === 'mcq-tts-question') setTtsQuestion(value);
    else if (key === 'mcq-tts-correct-answer') setTtsCorrectAnswer(value);
    else setTtsExtra(value);
  };

  const sizeLabel = cardSize.charAt(0).toUpperCase() + cardSize.slice(1);
  const resolveTypeLabel = () => {
    if (cloze) return 'Cloze';
    if (input) return 'Input';
    return 'Basic';
  };
  const typeLabel = resolveTypeLabel();
  const instructionsSummary =
    userInstructions.trim() === DEFAULT_INSTRUCTIONS.trim() ? 'Default' : 'Custom';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Your defaults</h1>
          <p className={styles.subtitle}>
            Applied to every conversion unless you set different options for a
            specific page.
          </p>
        </div>
        <div className={styles.topActions}>
          <span className={styles.savedHint}>
            <span aria-hidden="true">✓</span> Saved automatically
          </span>
          <button type="button" className={styles.resetLink}>
            Reset to defaults
          </button>
        </div>
      </div>

      <section className={styles.preview}>
        <div className={styles.previewHeader}>
          <p className={styles.previewLabel}>Preview</p>
          <span className={styles.previewMeta}>
            {cardStyle} · {sizeLabel} · {typeLabel}
          </span>
        </div>
        <div className={styles.cards}>
          {cloze ? (
            <div className={styles.flashcard}>
              <span className={styles.faceLabel}>Text</span>
              <span className={styles.faceText}>
                Spaced repetition reviews material at{' '}
                <span className={styles.cloze}>[...]</span> to strengthen recall.
              </span>
            </div>
          ) : (
            <>
              <div className={styles.flashcard}>
                <span className={styles.faceLabel}>Front</span>
                <span className={styles.faceText}>What is spaced repetition?</span>
              </div>
              <div className={styles.flashcard}>
                <span className={styles.faceLabel}>Back</span>
                <span className={styles.faceText}>{SIZE_BACK[cardSize]}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Essentials</h2>

        <div className={styles.field}>
          <div className={styles.fieldLabelRow}>
            <span className={styles.fieldLabel}>Deck name</span>
            <InfoIcon title="Customize the deck name. Leave it empty if you use subpages." />
          </div>
          <input
            className={styles.input}
            placeholder="Enter deck name (optional)"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Card style</span>
          <select
            className={styles.select}
            value={cardStyle}
            onChange={(e) => setCardStyle(e.target.value)}
          >
            <option>Special style</option>
            <option>Notion style</option>
            <option>No style</option>
            <option>My note types</option>
          </select>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabelRow}>
            <span className={styles.fieldLabel}>Toggle mode</span>
            <InfoIcon title="Open expands nested contents; Close keeps them collapsed for step-by-step review." />
          </div>
          <Segmented<ToggleMode>
            value={toggleMode}
            onChange={setToggleMode}
            options={[
              { label: 'Open nested toggles', value: 'open' },
              { label: 'Close nested toggles', value: 'close' },
            ]}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Card types</span>
          <Switch label="Cloze deletion" checked={cloze} onChange={setCloze} />
          <Switch label="Treat bold text as input" checked={input} onChange={setInput} />
          <Switch
            label="Basic and reversed"
            checked={basicReversed}
            onChange={setBasicReversed}
          />
          <Switch label="Reversed only" checked={reversed} onChange={setReversed} />
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>PDF &amp; AI</h2>
        <Switch
          label="Generate flashcards with Claude AI"
          checked={aiOn}
          onChange={setAiOn}
          disabled
          trailing={<span className={styles.premiumTag}>Paid plans</span>}
        />
        <Switch label="Process PDF files" checked={processPdfs} onChange={setProcessPdfs} />
        <Switch label="Extract text from PDFs" checked={extractText} onChange={setExtractText} />
        <div>
          <ConfigRow
            label="Card size"
            summary={sizeLabel}
            onConfigure={() => setOpenModal('card-size')}
          />
          <ConfigRow
            label="Multiple choice questions"
            summary={mcqEnabled ? 'On' : 'Off'}
            onConfigure={() => setOpenModal('mcq')}
          />
          <ConfigRow
            label="Field mapping"
            summary={fieldMapping.templateName}
            onConfigure={() => setOpenModal('field-mapping')}
          />
          <ConfigRow
            label="User instructions"
            summary={instructionsSummary}
            onConfigure={() => setOpenModal('user-instructions')}
          />
        </div>
      </section>

      <div className={styles.advanced}>
        <button
          type="button"
          className={styles.advancedToggle}
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <span className={`${styles.chevron}${advancedOpen ? ` ${styles.chevronOpen}` : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          Advanced
          <span className={styles.advancedCount}>filtering, links, audio, and more</span>
        </button>
        {advancedOpen && (
          <div className={styles.advancedBody}>
            <div className={styles.advancedGroup}>
              <p className={styles.advancedGroupTitle}>Filtering</p>
              <Switch label="Cherry-pick using 🍒 emoji" checked={cherry} onChange={setCherry} />
              <Switch label="Skip toggles with the 🥑 emoji" checked={avocado} onChange={setAvocado} />
            </div>
            <div className={styles.advancedGroup}>
              <p className={styles.advancedGroupTitle}>Links &amp; formatting</p>
              <Switch label="Add Notion link" checked={addNotionLink} onChange={setAddNotionLink} />
            </div>
            <div className={styles.advancedGroup}>
              <p className={styles.advancedGroupTitle}>Audio</p>
              <Switch label="Read cards aloud" checked={readAloud} onChange={setReadAloud} />
            </div>
            <div className={styles.advancedGroup}>
              <p className={styles.advancedGroupTitle}>Page identity</p>
              <Switch label="Use Notion ID" checked={useNotionId} onChange={setUseNotionId} />
            </div>
            <div className={styles.advancedGroup}>
              <p className={styles.advancedGroupTitle}>Debugging</p>
              <Switch
                label="Share files for debugging when conversion fails"
                checked={shareFiles}
                onChange={setShareFiles}
              />
            </div>
          </div>
        )}
      </div>

      <CardSizeModal
        isOpen={openModal === 'card-size'}
        onClose={() => setOpenModal(null)}
        value={cardSize}
        onChange={setCardSize}
      />
      <McqModal
        isOpen={openModal === 'mcq'}
        onClose={() => setOpenModal(null)}
        enabled={mcqEnabled}
        onEnabledChange={setMcqEnabled}
        ttsQuestion={ttsQuestion}
        ttsCorrectAnswer={ttsCorrectAnswer}
        ttsExtra={ttsExtra}
        onTtsChange={handleTts}
      />
      <FieldMappingModal
        isOpen={openModal === 'field-mapping'}
        onClose={() => setOpenModal(null)}
        mapping={fieldMapping}
        onChange={setFieldMapping}
      />
      <UserInstructionsModal
        isOpen={openModal === 'user-instructions'}
        onClose={() => setOpenModal(null)}
        value={userInstructions}
        onChange={setUserInstructions}
      />
    </div>
  );
}
