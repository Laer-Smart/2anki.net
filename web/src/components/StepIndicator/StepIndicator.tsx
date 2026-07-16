import { useTranslation } from 'react-i18next';
import styles from './StepIndicator.module.css';
import { StepIndex } from './jobStepFromStatus';

interface Props {
  readonly currentStep: StepIndex;
  readonly substep?: string;
  readonly compact?: boolean;
}

const STEP_LABEL_KEYS = [
  'uploaded',
  'parsing',
  'generating',
  'packaging',
] as const;

function getPillClass(step: StepIndex, currentStep: StepIndex): string {
  if (step < currentStep) return styles.pillDone;
  if (step === currentStep) return styles.pillActive;
  return styles.pillPending;
}

export function StepIndicator({
  currentStep,
  substep,
  compact = false,
}: Props) {
  const { t } = useTranslation('errors');
  const stepLabels = STEP_LABEL_KEYS.map((key) => t(`stepIndicator.${key}`));

  if (compact) {
    const label = stepLabels[currentStep - 1];
    return (
      <ol className={styles.indicator} aria-label={t('stepIndicator.progress')}>
        <li
          className={`${styles.pill} ${styles.pillActive}`}
          aria-current="step"
        >
          <span className={styles.dot} />
          {label}
          {substep && <span className={styles.substep}>({substep})</span>}
          <span className={styles.compactRest}> / {stepLabels.length}</span>
        </li>
      </ol>
    );
  }

  return (
    <ol className={styles.indicator} aria-label={t('stepIndicator.progress')}>
      {stepLabels.map((label, index) => {
        const step = (index + 1) as StepIndex;
        const isActive = step === currentStep;
        return (
          <li
            key={label}
            className={`${styles.pill} ${getPillClass(step, currentStep)}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={styles.dot} />
            {label}
            {isActive && substep && (
              <span className={styles.substep}>({substep})</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
