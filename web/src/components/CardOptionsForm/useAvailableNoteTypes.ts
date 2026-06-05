import { useEffect, useMemo, useState } from 'react';

import {
  NoteTypeStarter,
  getDefaultNoteTypes,
  getOfficialNoteTypes,
  getUserTemplates,
} from '../../lib/backend/templates';

export interface NoteTypeOption {
  value: string;
  label: string;
  origin: 'user' | 'official' | 'starter';
}

export interface NoteTypeOptions {
  basic: NoteTypeOption[];
  cloze: NoteTypeOption[];
  input: NoteTypeOption[];
}

function modelName(starter: NoteTypeStarter): string {
  return starter.noteType.name?.trim() || starter.name;
}

function isInputShape(starter: NoteTypeStarter): boolean {
  return starter.noteType.tmpls.some((t) => t.qfmt.includes('{{type:'));
}

function isClozeShape(starter: NoteTypeStarter): boolean {
  return starter.noteType.type === 1;
}

function isBasicShape(starter: NoteTypeStarter): boolean {
  return starter.noteType.type === 0 && !isInputShape(starter);
}

function toOption(
  starter: NoteTypeStarter,
  origin: NoteTypeOption['origin']
): NoteTypeOption {
  const value = modelName(starter);
  const label =
    starter.name === value ? starter.name : `${starter.name} (${value})`;
  return { value, label, origin };
}

function dedupeByValue(options: NoteTypeOption[]): NoteTypeOption[] {
  const seen = new Set<string>();
  const out: NoteTypeOption[] = [];
  for (const option of options) {
    if (option.value.length === 0 || seen.has(option.value)) continue;
    seen.add(option.value);
    out.push(option);
  }
  return out;
}

export function useAvailableNoteTypes(): {
  options: NoteTypeOptions;
  loading: boolean;
  error: Error | null;
} {
  const [user, setUser] = useState<NoteTypeStarter[]>([]);
  const [official, setOfficial] = useState<NoteTypeStarter[]>([]);
  const [starters, setStarters] = useState<NoteTypeStarter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getUserTemplates().catch(() => ({ templates: [], hiddenIds: [] })),
      getOfficialNoteTypes().catch(() => []),
      getDefaultNoteTypes().catch(() => []),
    ])
      .then(([userPayload, officials, defaults]) => {
        if (cancelled) return;
        const hidden = new Set(userPayload.hiddenIds);
        setUser(userPayload.templates);
        setOfficial(officials.filter((s) => !hidden.has(s.id)));
        setStarters(defaults.filter((s) => !hidden.has(s.id)));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err : new Error('Failed to load templates')
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo<NoteTypeOptions>(() => {
    const tagged = [
      ...user.map((s) => ({ starter: s, origin: 'user' as const })),
      ...official.map((s) => ({ starter: s, origin: 'official' as const })),
      ...starters.map((s) => ({ starter: s, origin: 'starter' as const })),
    ];

    return {
      basic: dedupeByValue(
        tagged
          .filter(({ starter }) => isBasicShape(starter))
          .map(({ starter, origin }) => toOption(starter, origin))
      ),
      cloze: dedupeByValue(
        tagged
          .filter(({ starter }) => isClozeShape(starter))
          .map(({ starter, origin }) => toOption(starter, origin))
      ),
      input: dedupeByValue(
        tagged
          .filter(({ starter }) => isInputShape(starter))
          .map(({ starter, origin }) => toOption(starter, origin))
      ),
    };
  }, [user, official, starters]);

  return { options, loading, error };
}
