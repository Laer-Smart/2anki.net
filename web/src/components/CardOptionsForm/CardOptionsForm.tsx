/* eslint-disable jsx-a11y/label-has-associated-control */
import React, {
  forwardRef,
  SyntheticEvent,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { clearStoredCardOptions } from '../../lib/data_layer/clearStoredCardOptions';
import { getLocalStorageBooleanValue } from '../../lib/data_layer/getLocalStorageBooleanValue';
import { getLocalStorageValue } from '../../lib/data_layer/getLocalStorageValue';
import CardOption from '../../lib/data_layer/model/CardOption';
import { saveValueInLocalStorage } from '../../lib/data_layer/saveValueInLocalStorage';
import { SettingsPayload } from '../../lib/types';
import sharedStyles from '../../styles/shared.module.css';
import { ErrorHandlerType } from '../errors/helpers/getErrorMessage';
import { FieldHint } from '../FieldHint';
import FontSizePicker from '../FontSizePicker';
import LocalCheckbox from '../LocalCheckbox';
import { availableTemplates } from '../modals/SettingsModal/constants';
import { useSettingsCardsOptions } from '../modals/SettingsModal/useSettingsCardsOptions';
import TemplateName from '../TemplateName';
import TemplateSelect from '../TemplateSelect';
import fieldStyles from './CardOptionsForm.module.css';
import { NoteTypePicker } from './NoteTypePicker';
import { useAvailableNoteTypes } from './useAvailableNoteTypes';

interface Props {
  pageTitle?: string | null;
  pageId: string | null;
  onSaved?: (event?: SyntheticEvent) => void;
  onReset?: () => void;
  setError: ErrorHandlerType;
  hideActions?: boolean;
}

export interface CardOptionsFormHandle {
  save: () => Promise<boolean>;
  reset: () => Promise<void>;
  isDirty: () => boolean;
}

const DEFAULT_TEMPLATE = 'specialstyle';
const DEFAULT_TOGGLE_MODE = 'close_toggle';
const DEFAULT_PAGE_EMOJI = 'first_emoji';
const DEFAULT_FONT_SIZE = '20';
const DEFAULT_MCQ_ENABLED = false;
const DEFAULT_MCQ_TTS_LANG = '';

const MCQ_TTS_LANGUAGE_OPTIONS = [
  { label: "Don't speak", value: '' },
  { label: 'English (US)', value: 'en_US' },
  { label: 'Spanish (Spain)', value: 'es_ES' },
  { label: 'French (France)', value: 'fr_FR' },
  { label: 'German', value: 'de_DE' },
  { label: 'Japanese', value: 'ja_JP' },
  { label: 'Mandarin (Simplified)', value: 'zh_CN' },
  { label: 'Portuguese (Brazil)', value: 'pt_BR' },
] as const;
const DEFAULT_USER_INSTRUCTIONS = `Some extra rules and explanations:
- Read the document from start to finish and identify any question and answers.
- Use the same language as the document or infer the language based on what is mostly used.
- Use the same text as the document and do not make up any questions or answers.
- Cite the document as source for the text.
- Be complete by finding all of the questions and answer in the document.
- Do not limit the number of number of questions and answer but create all of them!
- Do not make up any questions and use the questions in the document!
- Create a ul for every question pair, not one ul for all of them with li!`;

const OPTION_GROUPS: Array<{ label: string; keys: string[] }> = [
  {
    label: 'Content',
    keys: ['all', 'paragraph', 'max-one-toggle-per-card', 'perserve-newlines'],
  },
  {
    label: 'Card types',
    keys: ['cloze', 'enable-input', 'basic-reversed', 'reversed'],
  },
  {
    label: 'Filtering',
    keys: ['cherry', 'avocado', 'tags', 'disable-indented-bullets'],
  },
  {
    label: 'Links & formatting',
    keys: [
      'add-notion-link',
      'no-underline',
      'remove-mp3-links',
      'markdown-nested-bullet-points',
    ],
  },
  {
    label: 'PDF & AI',
    keys: [
      'process-pdfs',
      'vertex-ai-pdf-questions',
      'claude-ai-flashcards',
      'image-quiz-html-to-anki',
    ],
  },
  {
    label: 'Debugging',
    keys: ['share-files-for-debugging'],
  },
];

const GROUPED_KEYS = new Set(OPTION_GROUPS.flatMap((g) => g.keys));

const PREMIUM_KEYS = new Set([
  'vertex-ai-pdf-questions',
  'claude-ai-flashcards',
  'image-quiz-html-to-anki',
]);

function computeSnapshot(values: {
  deckName: string;
  fontSize: string;
  template: string;
  toggleMode: string;
  pageEmoji: string;
  basicName: string;
  clozeName: string;
  inputName: string;
  userInstructions: string;
  checkboxValues: Record<string, boolean>;
  mcqEnabled: boolean;
  mcqTtsQuestion: string;
  mcqTtsCorrectAnswer: string;
  mcqTtsExtra: string;
}) {
  const sortedCheckboxes = Object.keys(values.checkboxValues)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, values.checkboxValues[key]]);
  return JSON.stringify({ ...values, checkboxValues: sortedCheckboxes });
}

export const CardOptionsForm = forwardRef<CardOptionsFormHandle, Props>(
  function CardOptionsForm(
    {
      pageTitle,
      pageId,
      onSaved,
      onReset,
      setError,
      hideActions = false,
    }: Readonly<Props>,
    ref
  ) {
    const { isLoading, isError, options, loadingDefaultsError } =
      useSettingsCardsOptions(pageId);
    const {
      options: availableNoteTypes,
      loading: noteTypesLoading,
    } = useAvailableNoteTypes();
    const [settings, setSettings] = useState<SettingsPayload>({});
    const [loading, setLoading] = useState(!!pageId);
    const deckNameKey = 'deckName';
    const [deckName, setDeckName] = useState(
      getLocalStorageValue(
        deckNameKey,
        pageTitle ?? localStorage.getItem(deckNameKey) ?? '',
        settings
      )
    );
    const [fontSize, setFontSize] = useState(
      getLocalStorageValue('font-size', '', settings)
    );
    const [template, setTemplate] = useState(
      getLocalStorageValue('template', DEFAULT_TEMPLATE, settings)
    );
    const [toggleMode, setToggleMode] = useState(
      getLocalStorageValue('toggle-mode', DEFAULT_TOGGLE_MODE, settings)
    );
    const [pageEmoji, setPageEmoji] = useState(
      getLocalStorageValue('page-emoji', DEFAULT_PAGE_EMOJI, settings)
    );
    const [basicName, setBasicName] = useState(
      getLocalStorageValue('basic_model_name', '', settings)
    );
    const [clozeName, setClozeName] = useState(
      getLocalStorageValue('cloze_model_name', '', settings)
    );
    const [inputName, setInputName] = useState(
      getLocalStorageValue('input_model_name', '', settings)
    );
    const [userInstructions, setUserInstructions] = useState(
      getLocalStorageValue(
        'user-instructions',
        DEFAULT_USER_INSTRUCTIONS,
        settings
      )
    );
    const [checkboxValues, setCheckboxValues] = useState<
      Record<string, boolean>
    >({});
    const [mcqEnabled, setMcqEnabled] = useState(
      getLocalStorageBooleanValue('mcq-enabled', DEFAULT_MCQ_ENABLED.toString(), settings)
    );
    const [mcqTtsQuestion, setMcqTtsQuestion] = useState(
      getLocalStorageValue('mcq-tts-question', DEFAULT_MCQ_TTS_LANG, settings)
    );
    const [mcqTtsCorrectAnswer, setMcqTtsCorrectAnswer] = useState(
      getLocalStorageValue('mcq-tts-correct-answer', DEFAULT_MCQ_TTS_LANG, settings)
    );
    const [mcqTtsExtra, setMcqTtsExtra] = useState(
      getLocalStorageValue('mcq-tts-extra', DEFAULT_MCQ_TTS_LANG, settings)
    );
    const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);

    useEffect(() => {
      if (!options) return;
      const next: Record<string, boolean> = {};
      options.forEach((o: CardOption) => {
        next[o.key] = getLocalStorageBooleanValue(
          o.key,
          o.value.toString(),
          settings
        );
      });
      setCheckboxValues(next);
    }, [options, settings]);

    useEffect(() => {
      if (!pageId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setInitialSnapshot(null);
      setDeckName(pageTitle ?? localStorage.getItem(deckNameKey) ?? '');
      setFontSize(localStorage.getItem('font-size') ?? '');
      setTemplate(localStorage.getItem('template') ?? DEFAULT_TEMPLATE);
      setToggleMode(localStorage.getItem('toggle-mode') ?? DEFAULT_TOGGLE_MODE);
      setPageEmoji(localStorage.getItem('page-emoji') ?? DEFAULT_PAGE_EMOJI);
      setBasicName(localStorage.getItem('basic_model_name') ?? '');
      setClozeName(localStorage.getItem('cloze_model_name') ?? '');
      setInputName(localStorage.getItem('input_model_name') ?? '');
      setUserInstructions(
        localStorage.getItem('user-instructions') ?? DEFAULT_USER_INSTRUCTIONS
      );
      setMcqEnabled((localStorage.getItem('mcq-enabled') ?? DEFAULT_MCQ_ENABLED.toString()) === 'true');
      setMcqTtsQuestion(localStorage.getItem('mcq-tts-question') ?? DEFAULT_MCQ_TTS_LANG);
      setMcqTtsCorrectAnswer(localStorage.getItem('mcq-tts-correct-answer') ?? DEFAULT_MCQ_TTS_LANG);
      setMcqTtsExtra(localStorage.getItem('mcq-tts-extra') ?? DEFAULT_MCQ_TTS_LANG);
      setSettings({});

      const applyPayload = (payload: SettingsPayload) => {
        const assignments: Array<[string, (value: string) => void]> = [
          ['deckName', setDeckName],
          ['toggle-mode', setToggleMode],
          ['page-emoji', setPageEmoji],
          ['template', setTemplate],
          ['font-size', setFontSize],
          ['basic_model_name', setBasicName],
          ['cloze_model_name', setClozeName],
          ['input_model_name', setInputName],
          ['user-instructions', setUserInstructions],
          ['mcq-tts-question', setMcqTtsQuestion],
          ['mcq-tts-correct-answer', setMcqTtsCorrectAnswer],
          ['mcq-tts-extra', setMcqTtsExtra],
        ];
        assignments.forEach(([key, setter]) => {
          if (Object.hasOwn(payload, key)) {
            setter(payload[key] ?? '');
          }
        });
        if (Object.hasOwn(payload, 'mcq-enabled')) {
          setMcqEnabled((payload['mcq-enabled'] ?? 'false') === 'true');
        }
        setSettings(payload);
      };

      get2ankiApi()
        .getSettings(pageId)
        .then((payload) => {
          if (payload) applyPayload(payload);
          setLoading(false);
        })
        .catch((error) => {
          setLoading(false);
          setError(error);
        });
    }, [pageId]);

    useEffect(() => {
      if (isError && loadingDefaultsError) {
        setError(loadingDefaultsError);
      }
    }, [isError, loadingDefaultsError, setError]);

    const currentSnapshot = useMemo(
      () =>
        computeSnapshot({
          deckName,
          fontSize,
          template,
          toggleMode,
          pageEmoji,
          basicName,
          clozeName,
          inputName,
          userInstructions,
          checkboxValues,
          mcqEnabled,
          mcqTtsQuestion,
          mcqTtsCorrectAnswer,
          mcqTtsExtra,
        }),
      [
        deckName,
        fontSize,
        template,
        toggleMode,
        pageEmoji,
        basicName,
        clozeName,
        inputName,
        userInstructions,
        checkboxValues,
        mcqEnabled,
        mcqTtsQuestion,
        mcqTtsCorrectAnswer,
        mcqTtsExtra,
      ]
    );

    useEffect(() => {
      if (loading || isLoading) return;
      if (initialSnapshot !== null) return;
      const expectedCheckboxes = options?.length ?? 0;
      if (expectedCheckboxes > 0 && Object.keys(checkboxValues).length === 0)
        return;
      setInitialSnapshot(currentSnapshot);
    }, [
      loading,
      isLoading,
      initialSnapshot,
      options,
      checkboxValues,
      currentSnapshot,
    ]);

    const toggleCheckbox = (key: string, checked: boolean) => {
      setCheckboxValues((prev) => ({ ...prev, [key]: checked }));
      saveValueInLocalStorage(key, checked.toString(), pageId);
    };

    const resetStore = async () => {
      if (pageId) {
        await get2ankiApi().deleteSettings(pageId);
      } else {
        try {
          await get2ankiApi().resetUserCardOptions();
        } catch {
          setError(new Error("Couldn't reset card options. Try again."));
          return;
        }
      }
      if (options) clearStoredCardOptions(options);
      localStorage.removeItem('page-emoji');
      localStorage.removeItem('user-instructions');
      setDeckName('');
      setFontSize(DEFAULT_FONT_SIZE);
      setToggleMode(DEFAULT_TOGGLE_MODE);
      setTemplate(DEFAULT_TEMPLATE);
      setPageEmoji(DEFAULT_PAGE_EMOJI);
      setBasicName('');
      setClozeName('');
      setInputName('');
      setUserInstructions(DEFAULT_USER_INSTRUCTIONS);
      setMcqTtsQuestion(DEFAULT_MCQ_TTS_LANG);
      setMcqTtsCorrectAnswer(DEFAULT_MCQ_TTS_LANG);
      setMcqTtsExtra(DEFAULT_MCQ_TTS_LANG);
      if (options) {
        const reset: Record<string, boolean> = {};
        options.forEach((o: CardOption) => {
          reset[o.key] = false;
        });
        setCheckboxValues(reset);
      }
      setInitialSnapshot(null);
      onReset?.();
    };

    const serverSave = async (): Promise<boolean> => {
      if (!pageId) return true;
      const payload: { [key: string]: string } = {};
      Object.entries(checkboxValues).forEach(([key, value]) => {
        payload[key] = value.toString();
      });
      payload.deckName = deckName;
      payload['toggle-mode'] = toggleMode;
      payload.template = template;
      payload.basic_model_name = basicName;
      payload.cloze_model_name = clozeName;
      payload.input_model_name = inputName;
      payload['font-size'] = fontSize;
      payload['page-emoji'] = pageEmoji;
      payload['user-instructions'] = userInstructions;
      payload['mcq-enabled'] = mcqEnabled.toString();
      payload['mcq-tts-question'] = mcqTtsQuestion;
      payload['mcq-tts-correct-answer'] = mcqTtsCorrectAnswer;
      payload['mcq-tts-extra'] = mcqTtsExtra;

      try {
        await get2ankiApi().saveSettings({
          object_id: pageId,
          title: pageTitle ?? null,
          payload,
        });
        setInitialSnapshot(currentSnapshot);
        return true;
      } catch (error) {
        setError(error);
        return false;
      }
    };

    useImperativeHandle(ref, () => ({
      save: serverSave,
      reset: resetStore,
      isDirty: () =>
        initialSnapshot !== null && currentSnapshot !== initialSnapshot,
    }));

    const onSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!pageId) {
        onSaved?.(event);
        return;
      }
      const ok = await serverSave();
      if (ok) onSaved?.(event);
    };

    const checkboxesReady =
      !options ||
      options.length === 0 ||
      Object.keys(checkboxValues).length > 0;
    if (loading || isLoading || !checkboxesReady) {
      return (
        <div className={fieldStyles.loading}>
          <div className={sharedStyles.spinner} />
        </div>
      );
    }

    const isDirty =
      initialSnapshot !== null && currentSnapshot !== initialSnapshot;

    const optionsByKey = Object.fromEntries(
      (options ?? []).map((o: CardOption) => [o.key, o])
    );

    const generalOptions = (options ?? []).filter(
      (o: CardOption) => !GROUPED_KEYS.has(o.key)
    );

    const userInstructionsDisclosure = (
      <div className={fieldStyles.section}>
        <details>
          <summary className={fieldStyles.detailsSummary}>
            User instructions for PDF conversion
          </summary>
          <textarea
            className={fieldStyles.instructionsTextarea}
            value={userInstructions}
            onChange={(e) => {
              setUserInstructions(e.target.value);
              saveValueInLocalStorage(
                'user-instructions',
                e.target.value,
                pageId
              );
            }}
            rows={4}
            placeholder="Instructions for PDF conversion..."
          />
        </details>
      </div>
    );

    const showResetButton = !hideActions && pageId == null;
    const showSaveButton = !hideActions && isDirty;

    return (
      <div className={fieldStyles.form}>
        {(showResetButton || showSaveButton) && (
          <div className={fieldStyles.saveBar}>
            {showResetButton && (
              <button
                type="button"
                className={`${sharedStyles.btnSecondary} ${fieldStyles.actionButton}`}
                onClick={resetStore}
              >
                Reset to defaults
              </button>
            )}
            {showSaveButton && (
              <button
                type="button"
                className={`${sharedStyles.btnPrimary} ${fieldStyles.actionButton}`}
                onClick={onSubmit}
              >
                Save defaults
              </button>
            )}
          </div>
        )}

        <div className={fieldStyles.optionGroup}>
          <h3 className={fieldStyles.groupHeading}>Deck &amp; structure</h3>

          <div className={fieldStyles.section}>
            <div className={fieldStyles.labelRow}>
              <label htmlFor="deck-name" className={fieldStyles.sectionLabel}>
                Deck name
              </label>
              <FieldHint text="Customize the deck name. Leave it empty if you use subpages." />
            </div>
            <input
              id="deck-name"
              name="deck-name"
              className={fieldStyles.deckInput}
              placeholder="Enter deck name (optional)"
              value={deckName}
              onChange={(e) => {
                const newName = e.target.value;
                if (newName !== deckName) setDeckName(newName);
                saveValueInLocalStorage(deckNameKey, newName, pageId);
              }}
            />
          </div>

          <div className={fieldStyles.section}>
            <div className={fieldStyles.labelRow}>
              <label className={fieldStyles.sectionLabel}>Page icon</label>
              <FieldHint text="Whether to include the Notion page icon and where to place it." />
            </div>
            <div className={fieldStyles.segmented}>
              {(
                [
                  { label: 'Icon first', value: 'first_emoji' },
                  { label: 'Icon last', value: 'last_emoji' },
                  { label: 'Disable', value: 'disable_emoji' },
                ] as const
              ).map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  className={`${fieldStyles.segment} ${pageEmoji === value ? fieldStyles.segmentActive : ''}`}
                  onClick={() => {
                    setPageEmoji(value);
                    saveValueInLocalStorage('page-emoji', value, pageId);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={fieldStyles.section}>
            <div className={fieldStyles.labelRow}>
              <label className={fieldStyles.sectionLabel}>Toggle mode</label>
              <FieldHint text="Toggle header = card front; contents = card back. Nested toggles become their own cards. Open expands nested contents; Close keeps them collapsed for step-by-step review." />
            </div>
            <div className={fieldStyles.segmented}>
              {(
                [
                  { label: 'Open nested toggles', value: 'open_toggle' },
                  { label: 'Close nested toggles', value: 'close_toggle' },
                ] as const
              ).map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  className={`${fieldStyles.segment} ${toggleMode === value ? fieldStyles.segmentActive : ''}`}
                  onClick={() => {
                    setToggleMode(value);
                    saveValueInLocalStorage('toggle-mode', value, pageId);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {generalOptions.length > 0 && (
          <div className={fieldStyles.optionGroup}>
            <h3 className={fieldStyles.groupHeading}>General</h3>
            <div className={fieldStyles.groupOptions}>
              {generalOptions.map((o: CardOption) => (
                <LocalCheckbox
                  key={o.key}
                  defaultValue={checkboxValues[o.key] ?? false}
                  label={o.label}
                  description={o.description}
                  onChecked={(checked) => toggleCheckbox(o.key, checked)}
                  badge={PREMIUM_KEYS.has(o.key) ? 'Premium' : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {OPTION_GROUPS.map((group) => {
          const groupOptions = group.keys
            .map((k) => optionsByKey[k])
            .filter(Boolean);
          if (groupOptions.length === 0) return null;

          const isPdfAiGroup = group.label === 'PDF & AI';
          const isCardTypesGroup = group.label === 'Card types';

          return (
            <React.Fragment key={group.label}>
              <div className={fieldStyles.optionGroup}>
                <h3 className={fieldStyles.groupHeading}>{group.label}</h3>
                <div className={fieldStyles.groupOptions}>
                  {groupOptions.map((o: CardOption) => (
                    <LocalCheckbox
                      key={o.key}
                      defaultValue={checkboxValues[o.key] ?? false}
                      label={o.label}
                      description={o.description}
                      onChecked={(checked) => toggleCheckbox(o.key, checked)}
                      badge={PREMIUM_KEYS.has(o.key) ? 'Premium' : undefined}
                    />
                  ))}
                  {isPdfAiGroup && userInstructionsDisclosure}
                </div>
              </div>
              {isCardTypesGroup && (
                <div className={fieldStyles.optionGroup} id="mcq">
                  <div className={fieldStyles.groupHeader}>
                    <h3 className={fieldStyles.groupHeading}>Multiple choice</h3>
                    <div className={fieldStyles.segmented} role="group" aria-label="Enable multiple choice">
                      {(
                        [
                          { label: 'Off', value: false },
                          { label: 'On', value: true },
                        ] as const
                      ).map(({ label, value }) => (
                        <button
                          key={label}
                          type="button"
                          className={`${fieldStyles.segment} ${mcqEnabled === value ? fieldStyles.segmentActive : ''}`}
                          onClick={() => {
                            setMcqEnabled(value);
                            saveValueInLocalStorage('mcq-enabled', value.toString(), pageId);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className={fieldStyles.groupIntro}>
                    Multiple choice cards generated from your notes. Learn the syntax in the{' '}
                    <Link to="/documentation/cards/mcq" className={fieldStyles.groupIntroLink}>
                      docs
                    </Link>
                    .
                  </p>

                  {mcqEnabled && (
                    <>
                      <div className={fieldStyles.section}>
                        <p className={fieldStyles.sectionLabel}>Read aloud</p>
                        <p className={fieldStyles.sectionHint}>
                          Pick a voice for each field. Anki will speak it on the card.
                        </p>

                        {(
                          [
                            { label: 'Question', key: 'mcq-tts-question', value: mcqTtsQuestion, setter: setMcqTtsQuestion },
                            { label: 'Correct answer', key: 'mcq-tts-correct-answer', value: mcqTtsCorrectAnswer, setter: setMcqTtsCorrectAnswer },
                            { label: 'Extra', key: 'mcq-tts-extra', value: mcqTtsExtra, setter: setMcqTtsExtra },
                          ] as const
                        ).map(({ label, key, value, setter }) => (
                          <div key={key} className={fieldStyles.section}>
                            <div className={fieldStyles.labelRow}>
                              <label htmlFor={key} className={fieldStyles.sectionLabel}>{label}</label>
                            </div>
                            <select
                              id={key}
                              className={fieldStyles.deckInput}
                              value={value}
                              onChange={(e) => {
                                setter(e.target.value);
                                saveValueInLocalStorage(key, e.target.value, pageId);
                              }}
                            >
                              {MCQ_TTS_LANGUAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        ))}

                        <p className={fieldStyles.sectionHint}>
                          If your Anki device has no installed voice for the picked language, the audio stays silent.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className={fieldStyles.optionGroup}>
          <h3 className={fieldStyles.groupHeading}>Templates</h3>
          <p className={fieldStyles.groupIntro}>
            Pick the look of your generated cards and the names 2anki gives the
            Anki note types it creates. Saved note types from{' '}
            <Link to="/templates" className={fieldStyles.groupIntroLink}>
              Note types
            </Link>{' '}
            show up under <strong>My note types</strong>.
          </p>
          <div className={fieldStyles.section}>
            <TemplateSelect
              values={availableTemplates}
              value={template}
              name="template"
              label="Card style"
              hint="Pick the visual style applied during Notion → Anki conversion. Choose 'My note types' to use templates you saved in the Note types editor."
              pickedTemplate={(t) => {
                setTemplate(t);
                saveValueInLocalStorage('template', t, pageId);
              }}
            />
          </div>
          {template === 'custom' ? (
            <>
              <div className={fieldStyles.section}>
                <NoteTypePicker
                  name="basic_model_name"
                  label="Basic note type"
                  placeholder="Defaults to n2a-basic"
                  hint="Which of your saved note types to use for Basic (front/back) cards in this conversion."
                  value={basicName}
                  options={availableNoteTypes.basic}
                  loading={noteTypesLoading}
                  onChange={(name) => {
                    setBasicName(name);
                    saveValueInLocalStorage('basic_model_name', name, pageId);
                  }}
                />
              </div>
              <div className={fieldStyles.section}>
                <NoteTypePicker
                  name="cloze_model_name"
                  label="Cloze note type"
                  placeholder="Defaults to n2a-cloze"
                  hint="Which of your saved note types to use for Cloze deletion cards in this conversion."
                  value={clozeName}
                  options={availableNoteTypes.cloze}
                  loading={noteTypesLoading}
                  onChange={(name) => {
                    setClozeName(name);
                    saveValueInLocalStorage('cloze_model_name', name, pageId);
                  }}
                />
              </div>
              <div className={fieldStyles.section}>
                <NoteTypePicker
                  name="input_model_name"
                  label="Input note type"
                  placeholder="Defaults to n2a-input"
                  hint="Which of your saved note types to use for Type-the-answer cards in this conversion."
                  value={inputName}
                  options={availableNoteTypes.input}
                  loading={noteTypesLoading}
                  onChange={(name) => {
                    setInputName(name);
                    saveValueInLocalStorage('input_model_name', name, pageId);
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className={fieldStyles.section}>
                <TemplateName
                  name="basic_model_name"
                  value={basicName}
                  placeholder="Defaults to n2a-basic"
                  label="Basic template name"
                  hint="Name 2anki will give the Basic note type in Anki. Leave blank to use n2a-basic."
                  pickedName={(name) => {
                    setBasicName(name);
                    saveValueInLocalStorage('basic_model_name', name, pageId);
                  }}
                />
              </div>
              <div className={fieldStyles.section}>
                <TemplateName
                  name="cloze_model_name"
                  value={clozeName}
                  placeholder="Defaults to n2a-cloze"
                  label="Cloze template name"
                  hint="Name 2anki will give the Cloze note type in Anki. Leave blank to use n2a-cloze."
                  pickedName={(name) => {
                    setClozeName(name);
                    saveValueInLocalStorage('cloze_model_name', name, pageId);
                  }}
                />
              </div>
              <div className={fieldStyles.section}>
                <TemplateName
                  name="input_model_name"
                  value={inputName}
                  placeholder="Defaults to n2a-input"
                  label="Input template name"
                  hint="Name 2anki will give the Type-the-answer note type in Anki. Leave blank to use n2a-input."
                  pickedName={(name) => {
                    setInputName(name);
                    saveValueInLocalStorage('input_model_name', name, pageId);
                  }}
                />
              </div>
            </>
          )}
          <div className={fieldStyles.section}>
            <FontSizePicker
              fontSize={fontSize}
              pickedFontSize={(fs) => {
                setFontSize(fs);
                saveValueInLocalStorage('font-size', fs.toString(), pageId);
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);
