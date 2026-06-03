import knex from 'knex';

import NotionTopLevelPagesRepository from './NotionTopLevelPagesRepository';

describe('NotionTopLevelPagesRepository.getRecentByOwner generated SQL', () => {
  it('orders by last_edited_time desc nulls last then cached_at desc and limits', () => {
    const pg = knex({ client: 'pg' });
    const repo = new NotionTopLevelPagesRepository(pg);

    const sql = (repo.getRecentByOwner(7, 3) as unknown as { toString(): string }).toString();

    expect(sql).toBe(
      'select * from "notion_top_level_pages" where "owner" = 7 order by last_edited_time desc nulls last, "cached_at" desc limit 3'
    );
  });
});
