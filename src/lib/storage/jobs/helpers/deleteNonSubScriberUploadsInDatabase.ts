import { Knex } from 'knex';
import StorageHandler from '../../StorageHandler';
import Uploads from '../../../../data_layer/public/Uploads';

export const deleteNonSubScriberUploadsInDatabase = async (
  db: Knex,
  storage: StorageHandler
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

  for (const upload of nonSubScriberUploads.flat()) {
    console.info(`Deleting non-subscriber upload ${upload.key}`);
    await storage.delete(upload.key);
    await db('uploads').delete().where('key', upload.key);
  }
};
