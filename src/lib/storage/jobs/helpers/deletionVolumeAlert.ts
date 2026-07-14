import crypto from 'node:crypto';

import {
  ErrorEventInsert,
  IErrorEventRepository,
} from '../../../../data_layer/ErrorEventRepository';

export const DELETION_VOLUME_ABSOLUTE_THRESHOLD = 1000;
export const DELETION_VOLUME_TABLE_FRACTION_THRESHOLD = 0.25;
export const DELETION_VOLUME_TABLE_FRACTION_MIN_TOTAL = 100;

const ALARM_MESSAGE = 'Cleanup deletion volume exceeded the safe threshold';

export interface DeletionVolumeAssessment {
  anomalous: boolean;
  deletedCount: number;
  tableTotal: number;
  fractionOfTable: number;
  reasons: string[];
}

export function assessDeletionVolume(
  deletedCount: number,
  tableTotal: number
): DeletionVolumeAssessment {
  const fractionOfTable = tableTotal > 0 ? deletedCount / tableTotal : 0;
  const reasons: string[] = [];

  if (deletedCount >= DELETION_VOLUME_ABSOLUTE_THRESHOLD) {
    reasons.push(
      `deleted ${deletedCount} rows in one run (absolute threshold ${DELETION_VOLUME_ABSOLUTE_THRESHOLD})`
    );
  }

  const fractionPercent = Math.round(
    DELETION_VOLUME_TABLE_FRACTION_THRESHOLD * 100
  );
  if (
    tableTotal >= DELETION_VOLUME_TABLE_FRACTION_MIN_TOTAL &&
    fractionOfTable >= DELETION_VOLUME_TABLE_FRACTION_THRESHOLD
  ) {
    reasons.push(
      `deleted ${deletedCount} of ${tableTotal} rows (${Math.round(
        fractionOfTable * 100
      )}% of the table, threshold ${fractionPercent}%)`
    );
  }

  return {
    anomalous: reasons.length > 0,
    deletedCount,
    tableTotal,
    fractionOfTable,
    reasons,
  };
}

export async function raiseDeletionVolumeAlarm(
  job: string,
  assessment: DeletionVolumeAssessment,
  errorEvents: IErrorEventRepository
): Promise<void> {
  const detail = assessment.reasons.join('; ');
  console.error(`[deletion-volume-alarm] ${job}: ${ALARM_MESSAGE} — ${detail}`);

  const row: ErrorEventInsert = {
    source: 'server',
    message: ALARM_MESSAGE,
    message_hash: crypto
      .createHash('sha256')
      .update(`deletion-volume-anomaly:${job}`)
      .digest('hex'),
    stack: `${job}: ${detail}`,
    url: null,
    user_agent: null,
    release: null,
    user_id: null,
    ip_hash: null,
    context: {
      job,
      deletedCount: assessment.deletedCount,
      tableTotal: assessment.tableTotal,
      fractionOfTable: assessment.fractionOfTable,
      reasons: assessment.reasons,
    },
  };

  try {
    await errorEvents.insert(row);
  } catch (error) {
    console.error(
      `[deletion-volume-alarm] failed to record ops error event for ${job}:`,
      error
    );
  }
}
