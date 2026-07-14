import { Knex } from 'knex';
import StorageHandler from '../../StorageHandler';
import Uploads from '../../../../data_layer/public/Uploads';
import {
  ErrorEventRepository,
  IErrorEventRepository,
} from '../../../../data_layer/ErrorEventRepository';
import {
  assessDeletionVolume,
  raiseDeletionVolumeAlarm,
} from './deletionVolumeAlert';

export const deleteNonSubScriberUploadsInDatabase = async (
  db: Knex,
  storage: StorageHandler,
  errorEvents: IErrorEventRepository = new ErrorEventRepository(db)
) => {
  const query = await db.raw(`
    SELECT up.key
    FROM users u
    JOIN uploads up ON u.id = up.owner
    LEFT JOIN subscriptions s ON u.email = s.email OR u.email = s.linked_email
    WHERE u.patreon = false AND (s.active IS NULL OR s.active = false)
      AND NOT EXISTS (
        SELECT 1 FROM user_passes pass
        WHERE pass.user_id = u.id AND pass.expires_at > now()
      )
      AND NOT EXISTS (
        SELECT 1 FROM deck_shares ds
        WHERE ds.upload_key = up.key AND ds.revoked_at IS NULL
      );
  `);
  const nonSubScriberUploads: Uploads[] | undefined = query.rows;
  if (!nonSubScriberUploads) {
    return;
  }

  const candidates = nonSubScriberUploads.flat();

  const totalRow = await db('uploads').count('key as count').first();
  const tableTotal = Number(
    (totalRow as { count?: string | number } | undefined)?.count ?? 0
  );

  const assessment = assessDeletionVolume(candidates.length, tableTotal);
  if (assessment.anomalous) {
    await raiseDeletionVolumeAlarm(
      'deleteNonSubScriberUploadsInDatabase',
      assessment,
      errorEvents
    );
  }

  for (const upload of candidates) {
    console.info(`Deleting non-subscriber upload ${upload.key}`);
    await storage.delete(upload.key);
    await db('uploads').delete().where('key', upload.key);
  }
};
