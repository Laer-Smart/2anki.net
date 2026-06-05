import { nextDailyRunAt } from '../../ankify/nextDailyRunAt';
import {
  runParserCanary,
  CanaryResult,
} from '../../../usecases/canary/runParserCanary';
import type { IEmailService } from '../../../services/EmailService/EmailService';
import { SUPPORT_EMAIL_ADDRESS } from '../../constants';

export const PARSER_CANARY_TIME_OF_DAY = '03:00';
export const PARSER_CANARY_TIMEZONE = 'UTC';

function buildAlertText(failures: CanaryResult['failures']): string {
  const lines: string[] = ['Parser canary detected fixture divergence:\n'];

  for (const f of failures) {
    lines.push(`Fixture: ${f.fixtureName}`);
    lines.push(
      `  Expected: cards=${f.expected.cardCount} images=${f.expected.imageCount} cloze=${f.expected.clozeCount}`
    );
    lines.push(
      `  Actual:   cards=${f.actual.cardCount} images=${f.actual.imageCount} cloze=${f.actual.clozeCount}`
    );
    lines.push('');
  }

  lines.push(
    'Run `npx tsx src/usecases/canary/updateSnapshots.ts` after fixing the parser to regenerate snapshots.'
  );
  return lines.join('\n');
}

export interface ParserCanaryOptions {
  now?: () => Date;
  runCanary?: () => Promise<CanaryResult>;
}

export function scheduleParserCanary(
  emailService: IEmailService,
  options: ParserCanaryOptions = {}
): NodeJS.Timeout {
  const getNow = options.now ?? (() => new Date());
  const canaryRunner = options.runCanary ?? runParserCanary;

  async function tick() {
    try {
      const result = await canaryRunner();
      if (result.status === 'pass') {
        console.info('[parser-canary] all fixtures passed');
        return;
      }
      const summary = buildAlertText(result.failures);
      console.error('[parser-canary] fixture divergence detected:\n', summary);
      await emailService.sendParserCanaryAlert(SUPPORT_EMAIL_ADDRESS, summary);
    } catch (error) {
      console.error('[parser-canary] tick failed', error);
    }
  }

  function arm(): NodeJS.Timeout {
    const target = nextDailyRunAt(
      PARSER_CANARY_TIME_OF_DAY,
      PARSER_CANARY_TIMEZONE,
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
