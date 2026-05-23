import type { Knex } from 'knex';

export type CardOptions = Partial<{
  deckName: string;
  'font-size': string;
  template: string;
  'toggle-mode': string;
  'page-emoji': string;
  basic_model_name: string;
  cloze_model_name: string;
  input_model_name: string;
  'user-instructions': string;
  'skip-defaults': string;
  'mcq-enabled': string;
  'mcq-tts-question': string;
  'mcq-tts-correct-answer': string;
  'mcq-tts-extra': string;
}>;

export interface UserPreferences {
  cardOptions: CardOptions | null;
  theme: string | null;
  ankiWebAcknowledgedAt: string | null;
  uploadPrimerDismissedAt: string | null;
}

export interface IUserPreferencesRepository {
  get(userId: number): Promise<UserPreferences>;
  patch(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences>;
  migrate(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences>;
  clearCardOptions(userId: number): Promise<UserPreferences>;
}

const ALLOWED_CARD_OPTION_KEYS = new Set([
  'deckName',
  'font-size',
  'template',
  'toggle-mode',
  'page-emoji',
  'basic_model_name',
  'cloze_model_name',
  'input_model_name',
  'user-instructions',
  'skip-defaults',
  'mcq-enabled',
  'mcq-tts-question',
  'mcq-tts-correct-answer',
  'mcq-tts-extra',
]);

function sanitizeCardOptions(raw: CardOptions): CardOptions {
  const result: CardOptions = {};
  for (const key of ALLOWED_CARD_OPTION_KEYS) {
    const typedKey = key as keyof CardOptions;
    const value = raw[typedKey];
    if (typeof value === 'string') {
      result[typedKey] = value;
    }
  }
  return result;
}

export class UserPreferencesRepository implements IUserPreferencesRepository {
  constructor(private readonly database: Knex) {}

  async get(userId: number): Promise<UserPreferences> {
    const row = await this.database('users')
      .select('card_options', 'theme', 'anki_web_acknowledged_at', 'upload_primer_dismissed_at')
      .where({ id: userId })
      .first();
    return {
      cardOptions: row?.card_options ?? null,
      theme: row?.theme ?? null,
      ankiWebAcknowledgedAt: row?.anki_web_acknowledged_at?.toISOString() ?? null,
      uploadPrimerDismissedAt: row?.upload_primer_dismissed_at?.toISOString() ?? null,
    };
  }

  async patch(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const update: Record<string, unknown> = {};
    if (prefs.cardOptions != null) {
      update.card_options = sanitizeCardOptions(prefs.cardOptions);
    }
    if (prefs.theme != null) {
      update.theme = prefs.theme;
    }
    if (prefs.ankiWebAcknowledgedAt != null) {
      update.anki_web_acknowledged_at = this.database.raw(
        'GREATEST(anki_web_acknowledged_at, ?::timestamptz)',
        [prefs.ankiWebAcknowledgedAt]
      );
    }
    if (prefs.uploadPrimerDismissedAt != null) {
      update.upload_primer_dismissed_at = this.database.raw(
        'GREATEST(upload_primer_dismissed_at, ?::timestamptz)',
        [prefs.uploadPrimerDismissedAt]
      );
    }
    if (Object.keys(update).length > 0) {
      await this.database('users').where({ id: userId }).update(update);
    }
    return this.get(userId);
  }

  async migrate(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.get(userId);
    const update: Record<string, unknown> = {};
    if (prefs.cardOptions != null && current.cardOptions == null) {
      update.card_options = sanitizeCardOptions(prefs.cardOptions);
    }
    if (prefs.theme != null && current.theme == null) {
      update.theme = prefs.theme;
    }
    if (prefs.ankiWebAcknowledgedAt != null && current.ankiWebAcknowledgedAt == null) {
      update.anki_web_acknowledged_at = prefs.ankiWebAcknowledgedAt;
    }
    if (prefs.uploadPrimerDismissedAt != null && current.uploadPrimerDismissedAt == null) {
      update.upload_primer_dismissed_at = prefs.uploadPrimerDismissedAt;
    }
    if (Object.keys(update).length > 0) {
      await this.database('users').where({ id: userId }).update(update);
    }
    return this.get(userId);
  }

  async clearCardOptions(userId: number): Promise<UserPreferences> {
    await this.database('users').where({ id: userId }).update({ card_options: null });
    return this.get(userId);
  }
}

function laterOf(a: string | null, b: string): string {
  if (a == null) return b;
  return a >= b ? a : b;
}

export class InMemoryUserPreferencesRepository implements IUserPreferencesRepository {
  private readonly store = new Map<number, UserPreferences>();

  async get(userId: number): Promise<UserPreferences> {
    return (
      this.store.get(userId) ?? {
        cardOptions: null,
        theme: null,
        ankiWebAcknowledgedAt: null,
        uploadPrimerDismissedAt: null,
      }
    );
  }

  async patch(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.get(userId);
    const next: UserPreferences = {
      cardOptions: prefs.cardOptions ?? current.cardOptions,
      theme: prefs.theme ?? current.theme,
      ankiWebAcknowledgedAt: prefs.ankiWebAcknowledgedAt == null
        ? current.ankiWebAcknowledgedAt
        : laterOf(current.ankiWebAcknowledgedAt, prefs.ankiWebAcknowledgedAt),
      uploadPrimerDismissedAt: prefs.uploadPrimerDismissedAt == null
        ? current.uploadPrimerDismissedAt
        : laterOf(current.uploadPrimerDismissedAt, prefs.uploadPrimerDismissedAt),
    };
    this.store.set(userId, next);
    return next;
  }

  async migrate(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.get(userId);
    const next: UserPreferences = {
      cardOptions: current.cardOptions ?? prefs.cardOptions ?? null,
      theme: current.theme ?? prefs.theme ?? null,
      ankiWebAcknowledgedAt: current.ankiWebAcknowledgedAt ?? prefs.ankiWebAcknowledgedAt ?? null,
      uploadPrimerDismissedAt:
        current.uploadPrimerDismissedAt ?? prefs.uploadPrimerDismissedAt ?? null,
    };
    this.store.set(userId, next);
    return next;
  }

  async clearCardOptions(userId: number): Promise<UserPreferences> {
    const current = await this.get(userId);
    const next: UserPreferences = { ...current, cardOptions: null };
    this.store.set(userId, next);
    return next;
  }

  clear(): void {
    this.store.clear();
  }
}

export default UserPreferencesRepository;
