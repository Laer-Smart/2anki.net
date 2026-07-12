import { deleteNonSubScriberUploadsInDatabase } from './deleteNonSubScriberUploadsInDatabase';

function makeDb(uploadsToDelete: { key: string }[] = []) {
  const deleteMock = jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(1),
  });
  const db = {
    raw: jest.fn().mockResolvedValue({ rows: uploadsToDelete }),
    uploads: jest.fn(),
  } as unknown;

  const dbFn = jest.fn().mockReturnValue({ delete: deleteMock });
  Object.assign(dbFn, db);

  return { dbFn: dbFn as any, deleteMock };
}

function makeStorage(deleteResult = true) {
  return { delete: jest.fn().mockResolvedValue(deleteResult) };
}

describe('deleteNonSubScriberUploadsInDatabase', () => {
  it('does nothing when no uploads are returned', async () => {
    const { dbFn } = makeDb([]);
    const storage = makeStorage();

    await deleteNonSubScriberUploadsInDatabase(dbFn, storage as any);

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('deletes uploads that are not pinned by an active share', async () => {
    const { dbFn, deleteMock } = makeDb([{ key: 'unpinned.apkg' }]);
    const storage = makeStorage();

    await deleteNonSubScriberUploadsInDatabase(dbFn, storage as any);

    expect(storage.delete).toHaveBeenCalledWith('unpinned.apkg');
  });

  it('passes the NOT EXISTS subquery filtering shared uploads to db.raw', async () => {
    const { dbFn } = makeDb([]);
    const storage = makeStorage();

    await deleteNonSubScriberUploadsInDatabase(dbFn, storage as any);

    const rawCall = (dbFn.raw as jest.Mock).mock.calls[0][0] as string;
    expect(rawCall).toContain('deck_shares');
    expect(rawCall).toContain('revoked_at IS NULL');
  });

  it('exempts holders of an active user pass from upload deletion', async () => {
    const { dbFn } = makeDb([]);
    const storage = makeStorage();

    await deleteNonSubScriberUploadsInDatabase(dbFn, storage as any);

    const rawCall = (dbFn.raw as jest.Mock).mock.calls[0][0] as string;
    expect(rawCall).toContain('user_passes');
    expect(rawCall).toContain('pass.user_id = u.id');
    expect(rawCall).toContain('pass.expires_at > now()');
  });
});
