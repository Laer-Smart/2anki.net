import Knex from 'knex';
import KnexConfig from '../KnexConfig';
import { MindmapRepository } from './MindmapRepository';
import { MindmapsId } from './public/Mindmaps';
import { UsersId } from './public/Users';
import { MindmapData } from '../usecases/mindmaps/MindmapData';

const SAMPLE_HASH = 'bcrypt-test-fixture';

const RUN_INTEGRATION = process.env.DATABASE_URL != null;

(RUN_INTEGRATION ? describe : describe.skip)(
  'MindmapRepository — integration',
  () => {
    const db = Knex(KnexConfig);
    let userId: UsersId;

    beforeEach(async () => {
      const rows = await db('users')
        .insert({
          name: 'mindmap-test-user',
          email: `mindmap-test-${Date.now()}@example.com`,
          password: SAMPLE_HASH,
        })
        .returning('id');
      userId = rows[0].id as UsersId;
    });

    afterEach(async () => {
      await db('mindmaps').where({ user_id: userId }).del();
      await db('users').where({ id: userId }).del();
    });

    afterAll(() => db.destroy());

    it('create returns a row with the supplied title and data', async () => {
      const repo = new MindmapRepository(db);
      const data: MindmapData = { nodes: [{ id: '1', label: 'Root' }], edges: [] };

      const result = await repo.create({ user_id: userId, title: 'Test map', data });

      expect(result.title).toBe('Test map');
      expect(result.data).toMatchObject(data);
      expect(typeof result.id).toBe('string');
    });

    it('findById returns the row after create', async () => {
      const repo = new MindmapRepository(db);
      const created = await repo.create({ user_id: userId, title: 'Find me', data: { nodes: [], edges: [] } });

      const found = await repo.findById(created.id, userId);

      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find me');
    });

    it('findById returns null when the row does not exist', async () => {
      const repo = new MindmapRepository(db);

      const result = await repo.findById('00000000-0000-0000-0000-000000000000' as MindmapsId, userId);

      expect(result).toBeNull();
    });

    it('findByUserId returns only rows belonging to the given user', async () => {
      const repo = new MindmapRepository(db);
      await repo.create({ user_id: userId, title: 'Map A', data: { nodes: [], edges: [] } });
      await repo.create({ user_id: userId, title: 'Map B', data: { nodes: [], edges: [] } });

      const rows = await repo.findByUserId(userId);

      expect(rows.length).toBe(2);
      expect(rows.every((r) => r.user_id === userId)).toBe(true);
    });

    it('update changes title and data, then findById reflects the change', async () => {
      const repo = new MindmapRepository(db);
      const created = await repo.create({ user_id: userId, title: 'Before', data: { nodes: [], edges: [] } });
      const newData: MindmapData = { nodes: [{ id: 'n1', label: 'Updated' }], edges: [] };

      const updated = await repo.update(created.id, userId, { title: 'After', data: newData });

      expect(updated?.title).toBe('After');
      expect(updated?.data).toMatchObject(newData);

      const fetched = await repo.findById(created.id, userId);
      expect(fetched?.title).toBe('After');
    });

    it('update with a non-existent id returns null', async () => {
      const repo = new MindmapRepository(db);

      const result = await repo.update(
        '00000000-0000-0000-0000-000000000000' as MindmapsId,
        userId,
        { title: 'Ghost' }
      );

      expect(result).toBeNull();
    });

    it('delete removes the row so findById returns null', async () => {
      const repo = new MindmapRepository(db);
      const created = await repo.create({ user_id: userId, title: 'Delete me', data: { nodes: [], edges: [] } });

      await repo.delete(created.id, userId);

      expect(await repo.findById(created.id, userId)).toBeNull();
    });

    it('delete with a non-existent id does not throw', async () => {
      const repo = new MindmapRepository(db);

      await expect(
        repo.delete('00000000-0000-0000-0000-000000000000' as MindmapsId, userId)
      ).resolves.toBeUndefined();
    });

    it('countByUserId returns 1 after one create', async () => {
      const repo = new MindmapRepository(db);
      await repo.create({ user_id: userId, title: 'One', data: { nodes: [], edges: [] } });

      expect(await repo.countByUserId(userId)).toBe(1);
    });

    it('countByUserId returns 2 after two creates', async () => {
      const repo = new MindmapRepository(db);
      await repo.create({ user_id: userId, title: 'One', data: { nodes: [], edges: [] } });
      await repo.create({ user_id: userId, title: 'Two', data: { nodes: [], edges: [] } });

      expect(await repo.countByUserId(userId)).toBe(2);
    });

    it('cascade: deleting the user removes their mindmaps', async () => {
      const repo = new MindmapRepository(db);
      const created = await repo.create({ user_id: userId, title: 'Cascade me', data: { nodes: [], edges: [] } });

      await db('users').where({ id: userId }).del();

      const found = await db('mindmaps').where({ id: created.id }).first();
      expect(found).toBeUndefined();
    });
  }
);
