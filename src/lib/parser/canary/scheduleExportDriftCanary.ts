import { nextWeeklyRunAt } from './nextWeeklyRunAt';
import {
  runExportDriftCanary,
  ExportDriftResult,
} from '../../../usecases/canary/runExportDriftCanary';
import type { IEmailService } from '../../../services/EmailService/EmailService';
import { SUPPORT_EMAIL_ADDRESS } from '../../constants';

export const EXPORT_DRIFT_CANARY_WEEKDAY = 1;
export const EXPORT_DRIFT_CANARY_TIME_OF_DAY = '03:30';

type ExportDriftFailures = Extract<
  ExportDriftResult,
  { status: 'fail' }
>['failures'];

function buildAlertText(failures: ExportDriftFailures): string {
  const lines: string[] = [
    'Notion export-format drift canary detected divergence from the committed baseline.',
    'A representative export no longer converts to the expected shape — Notion may have changed its export format.\n',
  ];

  for (const f of failures) {
    lines.push(`Drift class: ${f.driftClass}`);
    lines.push(`  Fixture: ${f.htmlPath}`);
    lines.push(`  Diverged fields: ${f.divergedFields.join(', ')}`);
    lines.push(
      `  Expected: decks=${f.expected.deckCount} cards=${f.expected.cardCount} nonEmptyFront=${f.expected.nonEmptyFrontCount} nonEmptyBack=${f.expected.nonEmptyBackCount} media=${f.expected.mediaCount}`
    );
    lines.push(
      `  Actual:   decks=${f.actual.deckCount} cards=${f.actual.cardCount} nonEmptyFront=${f.actual.nonEmptyFrontCount} nonEmptyBack=${f.actual.nonEmptyBackCount} media=${f.actual.mediaCount}`
    );
    lines.push('');
  }

  lines.push(
    'If the parser regressed, fix it and re-run `npx tsx src/usecases/canary/checkExportDrift.ts`.'
  );
  lines.push(
    'If Notion changed its export format, re-export the reference page, update the fixture and baseline, then adapt the parser.'
  );
  return lines.join('\n');
}

export interface ExportDriftCanaryOptions {
  now?: () => Date;
  runCanary?: () => Promise<ExportDriftResult>;
}

export function scheduleExportDriftCanary(
  emailService: IEmailService,
  options: ExportDriftCanaryOptions = {}
): NodeJS.Timeout {
  const getNow = options.now ?? (() => new Date());
  const canaryRunner = options.runCanary ?? runExportDriftCanary;

  async function tick() {
    try {
      const result = await canaryRunner();
      if (result.status === 'pass') {
        console.info('[export-drift-canary] all reference exports passed');
        return;
      }
      const summary = buildAlertText(result.failures);
      console.error(
        '[export-drift-canary] export-format drift detected:\n',
        summary
      );
      await emailService.sendParserCanaryAlert(SUPPORT_EMAIL_ADDRESS, summary);
    } catch (error) {
      console.error('[export-drift-canary] tick failed', error);
    }
  }

  function arm(): NodeJS.Timeout {
    const target = nextWeeklyRunAt(
      EXPORT_DRIFT_CANARY_WEEKDAY,
      EXPORT_DRIFT_CANARY_TIME_OF_DAY,
      getNow()
    );
    const delayMs = Math.max(target.getTime() - getNow().getTime(), 1000);

    const handle = setTimeout(() => {
      void tick().finally(() => {
        arm();
      });
    }, delayMs);

    handle.unref();
    return handle;
  }

  return arm();
}
