import type { Knex } from 'knex';

export interface IoDraftRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}
export interface IoDraftImage {
  s3Key: string;
  imageName: string;
  header: string;
  rects: IoDraftRect[];
}
export interface IoDraftRow {
  id: string;
  user_id: number;
  name: string;
  mode: string;
  images: IoDraftImage[];
  updated_at: Date;
}

export class IoDraftRepository {
  private readonly table = 'io_drafts';
  constructor(private readonly database: Knex) {}

  listByUser(
    userId: number
  ): Promise<
    Array<Pick<IoDraftRow, 'id' | 'name' | 'mode' | 'updated_at' | 'images'>>
  > {
    return this.database<IoDraftRow>(this.table)
      .select('id', 'name', 'mode', 'updated_at', 'images')
      .where({ user_id: userId })
      .orderBy('updated_at', 'desc');
  }
  getById(id: string, userId: number): Promise<IoDraftRow | undefined> {
    return this.database<IoDraftRow>(this.table)
      .select('*')
      .where({ id, user_id: userId })
      .first();
  }
  async create(
    userId: number,
    name: string,
    mode: string,
    images: IoDraftImage[]
  ): Promise<string> {
    const [row] = await this.database(this.table)
      .insert({ user_id: userId, name, mode, images: JSON.stringify(images) })
      .returning('id');
    return typeof row === 'string' ? row : (row as { id: string }).id;
  }
  update(
    id: string,
    userId: number,
    name: string,
    mode: string,
    images: IoDraftImage[]
  ): Promise<number> {
    return this.database(this.table)
      .where({ id, user_id: userId })
      .update({
        name,
        mode,
        images: JSON.stringify(images),
        updated_at: new Date(),
      });
  }
  async deleteById(id: string, userId: number): Promise<IoDraftImage[]> {
    const draft = await this.getById(id, userId);
    if (draft == null) return [];
    await this.database(this.table).where({ id, user_id: userId }).delete();
    return draft.images;
  }
}
