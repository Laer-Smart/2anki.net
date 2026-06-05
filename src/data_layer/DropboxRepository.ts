import { Knex } from 'knex';

export type DropboxFile = {
  bytes: number;
  icon: string;
  id: string;
  isDir: boolean;
  link: string;
  linkType: string;
  name: string;
};

export type DropboxUploadRow = {
  id: number;
  bytes: number;
  icon: string;
  dropbox_id: string;
  isDir: boolean;
  linkType: string;
  name: string;
  owner: number;
  created_at: string | null;
};

export class DropboxRepository {
  private readonly table = 'dropbox_uploads';

  constructor(private readonly database: Knex) {}

  async saveFiles(files: DropboxFile[], owner: number | string) {
    await this.database(this.table).insert(
      files.map((file) => ({
        owner,
        bytes: file.bytes,
        icon: file.icon,
        dropbox_id: file.id,
        isDir: file.isDir,
        link: file.link,
        linkType: file.linkType,
        name: file.name,
      }))
    );
  }

  getByOwner(
    owner: number,
    limit: number,
    offset: number
  ): Promise<DropboxUploadRow[]> {
    if (owner == null) {
      console.warn('[DropboxRepository] getByOwner called with no owner');
      return Promise.resolve([]);
    }
    return this.database(this.table)
      .select(
        'id',
        'bytes',
        'icon',
        'dropbox_id',
        'isDir',
        'linkType',
        'name',
        'owner',
        'created_at'
      )
      .where({ owner, isDir: false })
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);
  }

  deleteByIdAndOwner(id: number, owner: number): Promise<number> {
    if (owner == null || id == null) {
      console.warn(
        '[DropboxRepository] deleteByIdAndOwner called with missing id or owner'
      );
      return Promise.resolve(0);
    }
    return this.database(this.table).where({ id, owner }).del();
  }
}
