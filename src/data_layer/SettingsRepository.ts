import { Knex } from 'knex';
import Settings, { SettingsInitializer } from './public/Settings';
import CardOption from '../lib/parser/Settings/CardOption';
import {
  normalizeStoredTemplates,
  pickCustomTemplate,
} from '../lib/parser/Settings/helpers/normalizeStoredTemplates';
import { unwrapStoredSettingsPayload } from '../lib/parser/Settings/unwrapStoredSettingsPayload';
import { AnkifyTemplateOverrides } from '../services/ankify/templateOverrides';

export interface ISettingsRepository {
  load(owner: string, id: string): Promise<CardOption>;
  loadIfExists(owner: string, id: string): Promise<CardOption | null>;
  attachCustomTemplates(owner: string, settings: CardOption): Promise<void>;
  loadAnkifyTemplateOverrides(
    owner: string,
    pageId?: string,
    fallbackPageId?: string
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
      .onConflict(['owner', 'object_id'])
      .merge(['payload', 'title']);
  }

  delete(owner: number | string, object_id: string) {
    return this.database(this.table).del().where({ owner, object_id });
  }

  getById(owner: string, object_id: string) {
    return this.database(this.table)
      .where({ owner, object_id })
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

      const settings = new CardOption(
        unwrapStoredSettingsPayload(result.payload)
      );
      await this.attachCustomTemplates(owner, settings);
      return settings;
    } catch (error: unknown) {
      console.info('Load settings from database failed');
      console.error(error);
      return null;
    }
  }

  async attachCustomTemplates(
    owner: string,
    settings: CardOption
  ): Promise<void> {
    if (settings.template !== 'custom') {
      return;
    }
    const templates = await this.database('templates')
      .where({ owner })
      .returning(['payload'])
      .first();
    const templateFiles = normalizeStoredTemplates(
      parseJsonColumn(templates?.payload)
    );
    if (templateFiles.length === 0) {
      return;
    }

    settings.n2aBasic = pickCustomTemplate(
      templateFiles,
      'n2a-basic',
      settings.basicModelName
    );
    settings.n2aCloze = pickCustomTemplate(
      templateFiles,
      'n2a-cloze',
      settings.clozeModelName
    );
    settings.n2aInput = pickCustomTemplate(
      templateFiles,
      'n2a-input',
      settings.inputModelName
    );

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

  private customBasicModelNameFromSettingsRow(
    row: { payload?: unknown } | undefined
  ): string | null {
    if (!row) {
      return null;
    }
    const cardOption = new CardOption(unwrapStoredSettingsPayload(row.payload));
    if (cardOption.template === 'custom') {
      return cardOption.basicModelName;
    }
    return null;
  }

  private async customBasicModelNameForPage(
    owner: string,
    pageId: string
  ): Promise<string | null> {
    const pageRow = await this.database(this.table)
      .where({ owner, object_id: pageId })
      .first();
    return this.customBasicModelNameFromSettingsRow(pageRow);
  }

  private async customBasicModelNameFromGlobal(
    owner: string
  ): Promise<string | null> {
    const userRow = await this.database('users')
      .select('card_options')
      .where({ id: owner })
      .first();
    const globalOptions = unwrapStoredSettingsPayload(userRow?.card_options);
    if (globalOptions.template === 'custom') {
      return new CardOption(globalOptions).basicModelName;
    }
    return null;
  }

  private async customBasicModelNameFromMostRecent(
    owner: string
  ): Promise<string | null> {
    const settingsRow = await this.database(this.table)
      .where({ owner })
      .orderBy('updated_at', 'desc')
      .first();
    return this.customBasicModelNameFromSettingsRow(settingsRow);
  }

  private async resolveCustomBasicModelName(
    owner: string,
    pageId?: string,
    fallbackPageId?: string
  ): Promise<string | null> {
    const pageCandidates = [pageId, fallbackPageId].filter(
      (candidate): candidate is string => candidate != null
    );
    for (const candidate of pageCandidates) {
      const fromPage = await this.customBasicModelNameForPage(owner, candidate);
      if (fromPage != null) {
        return fromPage;
      }
    }

    const fromGlobal = await this.customBasicModelNameFromGlobal(owner);
    if (fromGlobal != null) {
      return fromGlobal;
    }

    return this.customBasicModelNameFromMostRecent(owner);
  }

  async loadAnkifyTemplateOverrides(
    owner: string,
    pageId?: string,
    fallbackPageId?: string
  ): Promise<AnkifyTemplateOverrides | null> {
    try {
      const basicModelName = await this.resolveCustomBasicModelName(
        owner,
        pageId,
        fallbackPageId
      );
      if (basicModelName == null) {
        return null;
      }

      const templatesRow = await this.database('templates')
        .where({ owner })
        .first();
      if (!templatesRow) {
        return null;
      }

      const templateFiles = normalizeStoredTemplates(
        parseJsonColumn(templatesRow.payload)
      );
      const basicTemplate = pickCustomTemplate(
        templateFiles,
        'n2a-basic',
        basicModelName
      );
      if (!basicTemplate) {
        return null;
      }

      return {
        basicModelName,
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
