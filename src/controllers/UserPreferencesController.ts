import { Request, Response } from 'express';

import type { IUserPreferencesRepository } from '../data_layer/UserPreferencesRepository';
import { GetUserPreferencesUseCase } from '../usecases/GetUserPreferencesUseCase';
import { PatchUserPreferencesUseCase } from '../usecases/PatchUserPreferencesUseCase';
import { MigrateUserPreferencesUseCase } from '../usecases/MigrateUserPreferencesUseCase';
import { DeleteUserPreferencesCardOptionsUseCase } from '../usecases/UserPreferences/DeleteUserPreferencesCardOptionsUseCase';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

function isValidLanguage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 8 &&
    LANGUAGE_PATTERN.test(value)
  );
}

interface PrefsBody {
  cardOptions?: unknown;
  theme?: unknown;
  language?: unknown;
  ankiWebAcknowledgedAt?: unknown;
}

function validatePrefsBody(body: PrefsBody, res: Response): boolean {
  if (body.cardOptions !== undefined && !isPlainObject(body.cardOptions)) {
    res.status(400).json({ message: 'cardOptions must be an object.' });
    return false;
  }
  if (body.theme !== undefined && typeof body.theme !== 'string') {
    res.status(400).json({ message: 'theme must be a string.' });
    return false;
  }
  if (body.language !== undefined && !isValidLanguage(body.language)) {
    res.status(400).json({
      message: 'language must be a short BCP-47 code such as en or de.',
    });
    return false;
  }
  if (
    body.ankiWebAcknowledgedAt !== undefined &&
    !isValidTimestamp(body.ankiWebAcknowledgedAt)
  ) {
    res.status(400).json({
      message: 'ankiWebAcknowledgedAt must be a valid ISO timestamp.',
    });
    return false;
  }
  return true;
}

export class UserPreferencesController {
  private readonly getUseCase: GetUserPreferencesUseCase;
  private readonly patchUseCase: PatchUserPreferencesUseCase;
  private readonly migrateUseCase: MigrateUserPreferencesUseCase;
  private readonly deleteCardOptionsUseCase: DeleteUserPreferencesCardOptionsUseCase;

  constructor(repo: IUserPreferencesRepository) {
    this.getUseCase = new GetUserPreferencesUseCase(repo);
    this.patchUseCase = new PatchUserPreferencesUseCase(repo);
    this.migrateUseCase = new MigrateUserPreferencesUseCase(repo);
    this.deleteCardOptionsUseCase = new DeleteUserPreferencesCardOptionsUseCase(
      repo
    );
  }

  async get(_req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    const prefs = await this.getUseCase.execute(userId);
    res.status(200).json(prefs);
  }

  async patch(req: Request, res: Response): Promise<void> {
    const { cardOptions, theme, language, ankiWebAcknowledgedAt } = req.body;
    if (
      !validatePrefsBody(
        { cardOptions, theme, language, ankiWebAcknowledgedAt },
        res
      )
    )
      return;
    const userId = res.locals.owner as number;
    const prefs = await this.patchUseCase.execute({
      userId,
      cardOptions,
      theme,
      language,
      ankiWebAcknowledgedAt,
    });
    res.status(200).json(prefs);
  }

  async migrate(req: Request, res: Response): Promise<void> {
    const { cardOptions, theme, language, ankiWebAcknowledgedAt } = req.body;
    if (
      !validatePrefsBody(
        { cardOptions, theme, language, ankiWebAcknowledgedAt },
        res
      )
    )
      return;
    const userId = res.locals.owner as number;
    const prefs = await this.migrateUseCase.execute({
      userId,
      cardOptions,
      theme,
      language,
      ankiWebAcknowledgedAt,
    });
    res.status(200).json(prefs);
  }

  async deleteCardOptions(_req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    await this.deleteCardOptionsUseCase.execute(userId);
    res.status(204).send();
  }
}
