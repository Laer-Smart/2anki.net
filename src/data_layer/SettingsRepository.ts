import { Knex } from 'knex';
import Settings, { SettingsInitializer } from './public/Settings';
import CardOption from '../lib/parser/Settings/CardOption';
import { getCustomTemplate } from '../lib/parser/Settings/helpers/getCustomTemplate';
import { AnkifyTemplateOverrides } from '../services/ankify/templateOverrides';

export interface ISettingsRepository {
  load(owner: string, id: string): Promise<CardOption>;
  loadIfExists(owner: string, id: string): Promise<CardOption | null>;
  loadAnkifyTemplateOverrides(
    owner: string
  ): Promise<AnkifyTemplateOverrides | null>;
}

function parseJsonColumn(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

class SettingsRepository implements ISettingsRepository {
  table: string;

  constructor(private readonly database: Knex) {
    this.table = 'settings';
  }

  create({ owner, object_id, payload, title }: SettingsInitializer) {
    return this.database(this.table)
      .insert({
        owner,
        object_id,
        payload,
        title,
      })
      .onConflict('object_id')
      .merge();
  }

  delete(owner: number | string, object_id: string) {
    return this.database(this.table).del().where({ owner, object_id });
  }

  getById(object_id: string) {
    return this.database(this.table)
      .where({ object_id })
      .returning(['payload'])
      .first();
  }

  getAllByOwner(
    owner: string
  ): Promise<Pick<Settings, 'object_id' | 'title' | 'updated_at'>[]> {
    return this.database(this.table)
      .select('object_id', 'title', 'updated_at')
      .where({ owner })
      .orderBy('updated_at', 'desc');
  }

  updateTitle(object_id: string, title: string): Promise<void> {
    return this.database(this.table).where({ object_id }).update({ title });
  }

  deleteAllByOwner(owner: string): Promise<number> {
    return this.database(this.table).where({ owner }).del();
  }

  async load(owner: string, id: string): Promise<CardOption> {
    const settings = await this.loadIfExists(owner, id);
    if (settings) {
      return settings;
    }
    console.log('using default settings');
    return new CardOption(CardOption.LoadDefaultOptions());
  }

  async loadIfExists(owner: string, id: string): Promise<CardOption | null> {
    try {
      const result = await this.database(this.table)
        .where({ object_id: id, owner })
        .returning(['payload'])
        .first();
      if (!result) {
        return null;
      }

      const settings = new CardOption(result.payload.payload);
      const templates = await this.database('templates')
        .where({ owner })
        .returning(['payload'])
        .first();

      if (templates && settings.template === 'custom') {
        settings.n2aBasic = getCustomTemplate('n2a-basic', templates.payload);
        settings.n2aCloze = getCustomTemplate('n2a-cloze', templates.payload);
        settings.n2aInput = getCustomTemplate('n2a-input', templates.payload);

        if (settings.n2aBasic) {
          settings.n2aBasic.name = settings.basicModelName;
        }
        if (settings.n2aCloze) {
          settings.n2aCloze.name = settings.clozeModelName;
        }
        if (settings.n2aInput) {
          settings.n2aInput.name = settings.inputModelName;
        }
      }
      return settings;
    } catch (error: unknown) {
      console.info('Load settings from database failed');
      console.error(error);
      return null;
    }
  }

  async loadAnkifyTemplateOverrides(
    owner: string
  ): Promise<AnkifyTemplateOverrides | null> {
    try {
      const settingsRow = await this.database(this.table)
        .where({ owner })
        .orderBy('updated_at', 'desc')
        .first();
      if (!settingsRow) {
        return null;
      }

      const settingsPayload = parseJsonColumn(settingsRow.payload) as {
        payload?: Record<string, string>;
      } | null;
      const cardOption = new CardOption(settingsPayload?.payload ?? {});
      if (cardOption.template !== 'custom') {
        return null;
      }

      const templatesRow = await this.database('templates')
        .where({ owner })
        .first();
      if (!templatesRow) {
        return null;
      }

      const templatesPayload = parseJsonColumn(templatesRow.payload);
      if (!Array.isArray(templatesPayload)) {
        return null;
      }

      const basicTemplate = getCustomTemplate('n2a-basic', templatesPayload);
      if (!basicTemplate) {
        return null;
      }

      return {
        basicModelName: cardOption.basicModelName,
        basicTemplate,
      };
    } catch (error: unknown) {
      console.info('Load Ankify template overrides failed');
      console.error(error);
      return null;
    }
  }
}

export default SettingsRepository;
