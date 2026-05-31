import { useEffect, useRef, useState } from 'react';
import { track } from '../../../../lib/analytics/track';
import { markOnboarded } from '../../../../lib/backend/markOnboarded';
import styles from './OnboardingTour.module.css';

interface Step {
  title: string;
  hint: string;
}

const STEPS: ReadonlyArray<Step> = [
  {
    title: 'Drop a file, or pick a Notion page.',
    hint: 'Supported: .zip (Notion export), .html, .md, .pdf, .docx, .xlsx, .pptx, .csv',
  },
  {
    title: 'Pick deck settings.',
    hint: 'Rename the deck, choose a card template, and set conversion options in Card options.',
  },
  {
    title: 'Convert your file into a deck.',
    hint: 'Press Convert — 2anki builds your .apkg in seconds.',
  },
  {
    title: 'Download the deck, or send it to AnkiWeb.',
    hint: 'Your deck downloads automatically. Import it in Anki or sync via AnkiWeb.',
  },
];

const MIGRATION_CUTOFF = '2026-05-19T00:00:00.000Z';

interface OnboardingTourProps {
  createdAt: string | null;
  onboardedAt: string | null;
  migrationDate?: string;
}

function shouldShowTour(
  createdAt: string | null,
  onboardedAt: string | null,
  migrationDate: string
): boolean {
  if (createdAt == null) return false;
  if (onboardedAt != null) return false;
  return new Date(createdAt).getTime() >= new Date(migrationDate).getTime();
}

export function OnboardingTour({
  createdAt,
  onboardedAt,
  migrationDate = MIGRATION_CUTOFF,
}: Readonly<OnboardingTourProps>) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const shownTracked = useRef(false);

  const visible =
    !dismissed && shouldShowTour(createdAt, onboardedAt, migrationDate);

  useEffect(() => {
    if (visible && !shownTracked.current) {
      shownTracked.current = true;
      track('onboarding_shown');
    }
  }, [visible]);

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const handleSkip = () => {
    track(isLast ? 'onboarding_completed' : 'onboarding_skipped');
    setDismissed(true);
    void markOnboarded();
  };

  return (
    <div
      className={styles.tour}
      role="dialog"
      aria-label="Quick tour"
      aria-modal="true"
    >
      <div className={styles.progress}>
        {STEPS.map((s, i) => (
          <span
            key={s.title}
            className={i === step ? styles.dotActive : styles.dot}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className={styles.title}>{current.title}</p>
      <p className={styles.hint}>{current.hint}</p>
      <div className={styles.controls}>
        {!isFirst && (
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        )}
        {!isLast && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        )}
        <button type="button" className={styles.btnSkip} onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}
