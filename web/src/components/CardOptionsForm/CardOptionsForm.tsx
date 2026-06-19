/* eslint-disable jsx-a11y/label-has-associated-control */
import React, {
  forwardRef,
  SyntheticEvent,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../NavigationBar/helpers/getPlanLabel';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { resetStoredCardOptions } from '../../lib/data_layer/resetStoredCardOptions';
import { getLocalStorageBooleanValue } from '../../lib/data_layer/getLocalStorageBooleanValue';
import { getLocalStorageValue } from '../../lib/data_layer/getLocalStorageValue';
import CardOption from '../../lib/data_layer/model/CardOption';
import { saveValueInLocalStorage } from '../../lib/data_layer/saveValueInLocalStorage';
import { SettingsPayload } from '../../lib/types';
import sharedStyles from '../../styles/shared.module.css';
import { ErrorHandlerType } from '../errors/helpers/getErrorMessage';
import { FieldHint } from '../FieldHint';
import FontSizePicker from '../FontSizePicker';
import TextColorPicker from '../TextColorPicker';
import TextAlignPicker from '../TextAlignPicker';
import LocalCheckbox from '../LocalCheckbox';
import { availableTemplates } from '../modals/SettingsModal/constants';
import { useSettingsCardsOptions } from '../modals/SettingsModal/useSettingsCardsOptions';
import TemplateName from '../TemplateName';
import TemplateSelect from '../TemplateSelect';
import fieldStyles from './CardOptionsForm.module.css';
import { NoteTypePicker } from './NoteTypePicker';
import { useAvailableNoteTypes } from './useAvailableNoteTypes';
import { FieldMappingPanel } from './FieldMappingPanel';
import { getDefaultFieldMapping } from './fieldMappingDefaults';
import { OverlappingClozePreview } from './OverlappingClozePreview';
import type { FieldMapping } from '../../lib/cardFields/types';

interface Props {
  pageTitle?: string | null;
  pageId: string | null;
  isLoggedIn?: boolean;
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
const DEFAULT_MCQ_ENABLED = false;
const DEFAULT_MCQ_TTS_LANG = '';
const DEFAULT_TTS_MANUAL_LANG = '';
const DEFAULT_TTS_MANUAL_SIDE = 'front';
const TTS_MANUAL_SIDE_OPTIONS = [
  { label: 'Front', value: 'front' },
  { label: 'Back', value: 'back' },
  { label: 'Both', value: 'both' },
] as const;
const DEFAULT_CARD_SIZE = 'medium';
const DEFAULT_OVERLAPPING_CLOZE = 'off';
const DEFAULT_CODE_THEME = 'github';
const CODE_THEME_OPTIONS = [
  { label: 'GitHub', value: 'github' },
  { label: 'One Dark', value: 'one-dark' },
  { label: 'Solarized', value: 'solarized' },
  { label: 'Dracula', value: 'dracula' },
] as const;
const CARD_SIZE_VALUES = ['short', 'medium', 'detailed'] as const;
type CardSizeValue = (typeof CARD_SIZE_VALUES)[number];

function normalizeCardSize(raw: string | null | undefined): CardSizeValue {
  if (raw === 'short' || raw === 'medium' || raw === 'detailed') return raw;
  return DEFAULT_CARD_SIZE;
}

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
    keys: [
      'all',
      'paragraph',
      'max-one-toggle-per-card',
      'perserve-newlines',
      'split-sections-into-decks',
    ],
  },
  {
    label: 'Card types',
    keys: ['cloze', 'enable-input', 'basic-reversed', 'reversed'],
  },
  {
    label: 'Filtering',
    keys: [
      'cherry',
      'avocado',
      'tags',
      'section-tags',
      'disable-indented-bullets',
    ],
  },
  {
    label: 'Links & formatting',
    keys: ['add-notion-link', 'no-underline', 'markdown-nested-bullet-points'],
  },
  {
    label: 'PDF & AI',
    keys: [
      'process-pdfs',
      'pdf-extract-text',
      'download-pdfs',
      'claude-ai-flashcards',
      'ai-comprehensive',
    ],
  },
  {
    label: 'Media',
    keys: ['embed-images'],
  },
  {
    label: 'Image quizzes',
    keys: ['image-quiz-html-to-anki'],
  },
  {
    label: 'Debugging',
    keys: ['share-files-for-debugging'],
  },
];

const HIDDEN_KEYS = [
  'vertex-ai-pdf-questions',
  'remove-mp3-links',
  'cloze-from-toggle-content',
  'group-cloze-per-toggle',
];
const GROUPED_KEYS = new Set([
  ...OPTION_GROUPS.flatMap((g) => g.keys),
  ...HIDDEN_KEYS,
]);

const PREMIUM_KEYS = new Set([
  'vertex-ai-pdf-questions',
  'claude-ai-flashcards',
  'image-quiz-html-to-anki',
  'ai-comprehensive',
]);

const PAID_ONLY_KEYS = new Set(['ai-comprehensive']);

function computeSnapshot(values: {
  deckName: string;
  fontSize: string;
  textColor: string;
  textAlign: string;
  template: string;
  toggleMode: string;
  overlappingCloze: string;
  codeTheme: string;
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
  ttsAutoDetect: boolean;
  ttsManualLang: string;
  ttsManualSide: string;
  cardSize: CardSizeValue;
  fieldMapping: FieldMapping | null;
}) {
  const sortedCheckboxes = Object.keys(values.checkboxValues)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, values.checkboxValues[key]]);
  return JSON.stringify({ ...values, checkboxValues: sortedCheckboxes });
}

interface GatedToggleRowProps {
  id: string;
  heading: string;
  label: string;
  helperText: string;
  prerequisiteHelperText: string;
  checked: boolean;
  enabled: boolean;
  onChange: (checked: boolean) => void;
}

function GatedToggleRow({
  id,
  heading,
  label,
  helperText,
  prerequisiteHelperText,
  checked,
  enabled,
  onChange,
}: Readonly<GatedToggleRowProps>) {
  return (
    <div className={fieldStyles.optionGroup} id={id}>
      <h3 className={fieldStyles.groupHeading}>{heading}</h3>
      <div className={fieldStyles.section}>
        <label className={fieldStyles.toggleRow}>
          <span className={fieldStyles.toggleSwitch}>
            <input
              type="checkbox"
              role="switch"
              disabled={!enabled}
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className={fieldStyles.toggleSwitchTrack} aria-hidden />
          </span>
          <span className={fieldStyles.toggleLabel}>{label}</span>
        </label>
        {enabled ? (
          <p className={fieldStyles.sectionHint}>{helperText}</p>
        ) : (
          <p className={fieldStyles.sectionHint}>{prerequisiteHelperText}</p>
        )}
      </div>
    </div>
  );
}

const CLOZE_PREREQUISITE_HELP = 'Turn on Cloze deletion cards first.';
const CHERRY_PREREQUISITE_HELP = 'Turn on Cherry-pick first.';

export const CardOptionsForm = forwardRef<CardOptionsFormHandle, Props>(
  function CardOptionsForm(
    {
      pageTitle,
      pageId,
      isLoggedIn = true,
      onSaved,
      onReset,
      setError,
      hideActions = false,
    }: Readonly<Props>,
    ref
  ) {
    const { isLoading, isError, options, loadingDefaultsError } =
      useSettingsCardsOptions(pageId);
    const { data: userLocals } = useUserLocals();
    const isPaying = isPayingUser(userLocals?.locals);
    const { options: availableNoteTypes, loading: noteTypesLoading } =
      useAvailableNoteTypes();
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
    const [textColor, setTextColor] = useState(
      getLocalStorageValue('text-color', '', settings)
    );
    const [textAlign, setTextAlign] = useState(
      getLocalStorageValue('text-align', '', settings)
    );
    const [template, setTemplate] = useState(
      getLocalStorageValue('template', DEFAULT_TEMPLATE, settings)
    );
    const [toggleMode, setToggleMode] = useState(
      getLocalStorageValue('toggle-mode', DEFAULT_TOGGLE_MODE, settings)
    );
    const [overlappingCloze, setOverlappingCloze] = useState(
      getLocalStorageValue(
        'overlapping-cloze',
        DEFAULT_OVERLAPPING_CLOZE,
        settings
      )
    );
    const [codeTheme, setCodeTheme] = useState(
      getLocalStorageValue('code-theme', DEFAULT_CODE_THEME, settings)
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
      getLocalStorageBooleanValue(
        'mcq-enabled',
        DEFAULT_MCQ_ENABLED.toString(),
        settings
      )
    );
    const [mcqTtsQuestion, setMcqTtsQuestion] = useState(
      getLocalStorageValue('mcq-tts-question', DEFAULT_MCQ_TTS_LANG, settings)
    );
    const [mcqTtsCorrectAnswer, setMcqTtsCorrectAnswer] = useState(
      getLocalStorageValue(
        'mcq-tts-correct-answer',
        DEFAULT_MCQ_TTS_LANG,
        settings
      )
    );
    const [mcqTtsExtra, setMcqTtsExtra] = useState(
      getLocalStorageValue('mcq-tts-extra', DEFAULT_MCQ_TTS_LANG, settings)
    );
    const [ttsAutoDetect, setTtsAutoDetect] = useState(
      getLocalStorageBooleanValue('tts-auto-detect', 'false', settings)
    );
    const [ttsManualLang, setTtsManualLang] = useState(
      getLocalStorageValue('tts-manual-lang', DEFAULT_TTS_MANUAL_LANG, settings)
    );
    const [ttsManualSide, setTtsManualSide] = useState(
      getLocalStorageValue('tts-manual-side', DEFAULT_TTS_MANUAL_SIDE, settings)
    );
    const [cardSize, setCardSize] = useState<CardSizeValue>(() =>
      normalizeCardSize(
        getLocalStorageValue('card-size', DEFAULT_CARD_SIZE, settings)
      )
    );
    const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(() =>
      getDefaultFieldMapping(
        getLocalStorageValue('template', DEFAULT_TEMPLATE, settings)
      )
    );
    const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const savingRef = useRef(false);

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
      setTextColor(localStorage.getItem('text-color') ?? '');
      setTextAlign(localStorage.getItem('text-align') ?? '');
      setTemplate(localStorage.getItem('template') ?? DEFAULT_TEMPLATE);
      setToggleMode(localStorage.getItem('toggle-mode') ?? DEFAULT_TOGGLE_MODE);
      setOverlappingCloze(
        localStorage.getItem('overlapping-cloze') ?? DEFAULT_OVERLAPPING_CLOZE
      );
      setPageEmoji(localStorage.getItem('page-emoji') ?? DEFAULT_PAGE_EMOJI);
      setCodeTheme(localStorage.getItem('code-theme') ?? DEFAULT_CODE_THEME);
      setBasicName(localStorage.getItem('basic_model_name') ?? '');
      setClozeName(localStorage.getItem('cloze_model_name') ?? '');
      setInputName(localStorage.getItem('input_model_name') ?? '');
      setUserInstructions(
        localStorage.getItem('user-instructions') ?? DEFAULT_USER_INSTRUCTIONS
      );
      setMcqEnabled(
        (localStorage.getItem('mcq-enabled') ??
          DEFAULT_MCQ_ENABLED.toString()) === 'true'
      );
      setMcqTtsQuestion(
        localStorage.getItem('mcq-tts-question') ?? DEFAULT_MCQ_TTS_LANG
      );
      setMcqTtsCorrectAnswer(
        localStorage.getItem('mcq-tts-correct-answer') ?? DEFAULT_MCQ_TTS_LANG
      );
      setMcqTtsExtra(
        localStorage.getItem('mcq-tts-extra') ?? DEFAULT_MCQ_TTS_LANG
      );
      setTtsAutoDetect(
        (localStorage.getItem('tts-auto-detect') ?? 'false') === 'true'
      );
      setTtsManualLang(
        localStorage.getItem('tts-manual-lang') ?? DEFAULT_TTS_MANUAL_LANG
      );
      setTtsManualSide(
        localStorage.getItem('tts-manual-side') ?? DEFAULT_TTS_MANUAL_SIDE
      );
      setCardSize(normalizeCardSize(localStorage.getItem('card-size')));
      setFieldMapping(
        getDefaultFieldMapping(
          localStorage.getItem('template') ?? DEFAULT_TEMPLATE
        )
      );
      setSettings({});

      const applyPayload = (payload: SettingsPayload) => {
        const assignments: Array<[string, (value: string) => void]> = [
          ['deckName', setDeckName],
          ['toggle-mode', setToggleMode],
          ['overlapping-cloze', setOverlappingCloze],
          ['code-theme', setCodeTheme],
          ['page-emoji', setPageEmoji],
          ['template', setTemplate],
          ['font-size', setFontSize],
          ['text-color', setTextColor],
          ['text-align', setTextAlign],
          ['basic_model_name', setBasicName],
          ['cloze_model_name', setClozeName],
          ['input_model_name', setInputName],
          ['user-instructions', setUserInstructions],
          ['mcq-tts-question', setMcqTtsQuestion],
          ['mcq-tts-correct-answer', setMcqTtsCorrectAnswer],
          ['mcq-tts-extra', setMcqTtsExtra],
          ['tts-manual-lang', setTtsManualLang],
          ['tts-manual-side', setTtsManualSide],
        ];
        assignments.forEach(([key, setter]) => {
          if (Object.hasOwn(payload, key)) {
            setter(payload[key] ?? '');
          }
        });
        if (Object.hasOwn(payload, 'mcq-enabled')) {
          setMcqEnabled((payload['mcq-enabled'] ?? 'false') === 'true');
        }
        if (Object.hasOwn(payload, 'tts-auto-detect')) {
          setTtsAutoDetect((payload['tts-auto-detect'] ?? 'false') === 'true');
        }
        if (Object.hasOwn(payload, 'card-size')) {
          setCardSize(normalizeCardSize(payload['card-size']));
        }
        if (Object.hasOwn(payload, 'field-mapping')) {
          try {
            const parsed = JSON.parse(
              payload['field-mapping'] ?? 'null'
            ) as unknown;
            setFieldMapping(
              parsed != null && typeof parsed === 'object'
                ? (parsed as FieldMapping)
                : null
            );
          } catch {
            setFieldMapping(null);
          }
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
          textColor,
          textAlign,
          template,
          toggleMode,
          overlappingCloze,
          codeTheme,
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
          ttsAutoDetect,
          ttsManualLang,
          ttsManualSide,
          cardSize,
          fieldMapping,
        }),
      [
        deckName,
        fontSize,
        textColor,
        textAlign,
        template,
        toggleMode,
        overlappingCloze,
        codeTheme,
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
        ttsAutoDetect,
        ttsManualLang,
        ttsManualSide,
        cardSize,
        fieldMapping,
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

    useEffect(() => {
      if (!justSaved) return;
      const timer = setTimeout(() => setJustSaved(false), 2500);
      return () => clearTimeout(timer);
    }, [justSaved]);

    const toggleCheckbox = (key: string, checked: boolean) => {
      setCheckboxValues((prev) => ({ ...prev, [key]: checked }));
      saveValueInLocalStorage(key, checked.toString(), pageId);
    };

    const resetStore = async () => {
      if (pageId) {
        await get2ankiApi().deleteSettings(pageId);
      } else if (isLoggedIn) {
        try {
          await get2ankiApi().resetUserCardOptions();
        } catch {
          setError(new Error("Couldn't reset card options. Try again."));
          return;
        }
      }
      resetStoredCardOptions(options ?? []);
      setDeckName('');
      setFontSize('');
      setTextColor('');
      setTextAlign('');
      setToggleMode(DEFAULT_TOGGLE_MODE);
      setOverlappingCloze(DEFAULT_OVERLAPPING_CLOZE);
      setCodeTheme(DEFAULT_CODE_THEME);
      setTemplate(DEFAULT_TEMPLATE);
      setPageEmoji(DEFAULT_PAGE_EMOJI);
      setBasicName('');
      setClozeName('');
      setInputName('');
      setUserInstructions(DEFAULT_USER_INSTRUCTIONS);
      setMcqEnabled(DEFAULT_MCQ_ENABLED);
      setMcqTtsQuestion(DEFAULT_MCQ_TTS_LANG);
      setMcqTtsCorrectAnswer(DEFAULT_MCQ_TTS_LANG);
      setMcqTtsExtra(DEFAULT_MCQ_TTS_LANG);
      setTtsAutoDetect(false);
      setTtsManualLang(DEFAULT_TTS_MANUAL_LANG);
      setTtsManualSide(DEFAULT_TTS_MANUAL_SIDE);
      setCardSize(DEFAULT_CARD_SIZE);
      setFieldMapping(getDefaultFieldMapping(DEFAULT_TEMPLATE));
      if (options) {
        const reset: Record<string, boolean> = {};
        options.forEach((o: CardOption) => {
          reset[o.key] = o.value;
        });
        setCheckboxValues(reset);
      }
      setInitialSnapshot(null);
      onReset?.();
    };

    const serverSave = async (): Promise<boolean> => {
      if (!pageId) return true;
      if (savingRef.current) return false;
      savingRef.current = true;
      const payload: { [key: string]: string } = {};
      Object.entries(checkboxValues).forEach(([key, value]) => {
        payload[key] = value.toString();
      });
      payload.deckName = deckName;
      payload['toggle-mode'] = toggleMode;
      payload['overlapping-cloze'] = overlappingCloze;
      payload['code-theme'] = codeTheme;
      payload.template = template;
      payload.basic_model_name = basicName;
      payload.cloze_model_name = clozeName;
      payload.input_model_name = inputName;
      payload['font-size'] = fontSize;
      payload['text-color'] = textColor;
      payload['text-align'] = textAlign;
      payload['page-emoji'] = pageEmoji;
      payload['user-instructions'] = userInstructions;
      payload['mcq-enabled'] = mcqEnabled.toString();
      payload['mcq-tts-question'] = mcqTtsQuestion;
      payload['mcq-tts-correct-answer'] = mcqTtsCorrectAnswer;
      payload['mcq-tts-extra'] = mcqTtsExtra;
      payload['tts-auto-detect'] = ttsAutoDetect.toString();
      payload['tts-manual-lang'] = ttsManualLang;
      payload['tts-manual-side'] = ttsManualSide;
      payload['card-size'] = cardSize;
      if (fieldMapping != null) {
        payload['field-mapping'] = JSON.stringify(fieldMapping);
      }

      setIsSaving(true);
      setSaveFailed(false);
      try {
        await get2ankiApi().saveSettings({
          object_id: pageId,
          title: pageTitle ?? null,
          payload,
        });
        setInitialSnapshot(currentSnapshot);
        if (onSaved == null) setJustSaved(true);
        return true;
      } catch (error) {
        setSaveFailed(true);
        setError(error);
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
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
    const showSavedStatus = !hideActions && justSaved;
    const showSaveError = !hideActions && saveFailed;

    return (
      <div className={fieldStyles.form}>
        {(showResetButton ||
          showSaveButton ||
          showSavedStatus ||
          showSaveError) && (
          <div className={fieldStyles.saveBar}>
            {showSaveError && (
              <span role="alert" className={fieldStyles.saveError}>
                Couldn&apos;t save your defaults. Try again.
              </span>
            )}
            {showSavedStatus && (
              <span
                role="status"
                aria-live="polite"
                className={fieldStyles.savedStatus}
              >
                Defaults saved
              </span>
            )}
            {showResetButton && (
              <button
                type="button"
                className={`${sharedStyles.btnSecondary} ${fieldStyles.actionButton}`}
                onClick={resetStore}
                disabled={isSaving}
              >
                Reset to defaults
              </button>
            )}
            {showSaveButton && (
              <button
                type="button"
                className={`${sharedStyles.btnPrimary} ${fieldStyles.actionButton}`}
                onClick={onSubmit}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving && (
                  <span className={sharedStyles.spinnerSmall} aria-hidden />
                )}
                {isSaving ? 'Saving' : 'Save defaults'}
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
            .filter(Boolean)
            .filter((o: CardOption) => isPaying || !PAID_ONLY_KEYS.has(o.key));
          if (groupOptions.length === 0) return null;

          const isPdfAiGroup = group.label === 'PDF & AI';
          const isCardTypesGroup = group.label === 'Card types';
          const isLinksFormattingGroup = group.label === 'Links & formatting';
          const isFilteringGroup = group.label === 'Filtering';
          const sectionTagsOption = optionsByKey['section-tags'];
          const inlineOptions = groupOptions.filter(
            (o: CardOption) => o.key !== 'section-tags'
          );

          return (
            <React.Fragment key={group.label}>
              <div
                className={fieldStyles.optionGroup}
                id={isPdfAiGroup ? 'pdf-ai' : undefined}
              >
                <h3 className={fieldStyles.groupHeading}>{group.label}</h3>
                <div className={fieldStyles.groupOptions}>
                  {inlineOptions.map((o: CardOption) => (
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
              {isFilteringGroup && sectionTagsOption && (
                <GatedToggleRow
                  id="section-tags"
                  heading={sectionTagsOption.label}
                  label={sectionTagsOption.label}
                  helperText={sectionTagsOption.description}
                  prerequisiteHelperText={CHERRY_PREREQUISITE_HELP}
                  checked={checkboxValues['section-tags'] ?? false}
                  enabled={checkboxValues['cherry'] ?? false}
                  onChange={(checked) =>
                    toggleCheckbox('section-tags', checked)
                  }
                />
              )}
              {isLinksFormattingGroup && (
                <div className={fieldStyles.optionGroup} id="code-blocks">
                  <h3 className={fieldStyles.groupHeading}>Code blocks</h3>
                  <p className={fieldStyles.groupIntro}>
                    Code from your notes keeps its colors in Anki. Pick the
                    look.
                  </p>
                  <div className={fieldStyles.section}>
                    <div className={fieldStyles.labelRow}>
                      <label
                        htmlFor="code-theme"
                        className={fieldStyles.sectionLabel}
                      >
                        Code theme
                      </label>
                      <FieldHint text="Colors for code from your notes. Switches between light and dark to match your Anki theme." />
                    </div>
                    <select
                      id="code-theme"
                      className={fieldStyles.deckInput}
                      value={codeTheme}
                      onChange={(e) => {
                        setCodeTheme(e.target.value);
                        saveValueInLocalStorage(
                          'code-theme',
                          e.target.value,
                          pageId
                        );
                      }}
                    >
                      {CODE_THEME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {isCardTypesGroup && (
                <div className={fieldStyles.optionGroup} id="card-size">
                  <div className={fieldStyles.groupHeader}>
                    <h3 className={fieldStyles.groupHeading}>Card size</h3>
                    <div
                      className={fieldStyles.segmented}
                      role="group"
                      aria-label="Card size"
                    >
                      {(
                        [
                          { label: 'Short', value: 'short' },
                          { label: 'Medium', value: 'medium' },
                          { label: 'Detailed', value: 'detailed' },
                        ] as const
                      ).map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          className={`${fieldStyles.segment} ${cardSize === value ? fieldStyles.segmentActive : ''}`}
                          aria-pressed={cardSize === value}
                          onClick={() => {
                            setCardSize(value);
                            saveValueInLocalStorage('card-size', value, pageId);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className={fieldStyles.groupIntro}>
                    AI conversion uses this to decide how much fits on each
                    card.
                  </p>
                  <ul className={fieldStyles.bulletList}>
                    <li>
                      <strong>Short</strong> — 1 fact per card, ~80 characters
                      per answer. Best for vocabulary, dates, formulas.
                    </li>
                    <li>
                      <strong>Medium</strong> — 1–2 facts per card, ~160
                      characters per answer. Good default for most notes.
                    </li>
                    <li>
                      <strong>Detailed</strong> — 3–4 facts per card, ~320
                      characters per answer. Better for tightly grouped concepts
                      you want to review together.
                    </li>
                  </ul>
                </div>
              )}
              {isCardTypesGroup && (
                <div className={fieldStyles.optionGroup} id="mcq">
                  <div className={fieldStyles.groupHeader}>
                    <h3 className={fieldStyles.groupHeading}>
                      Multiple choice questions (MCQ)
                    </h3>
                    <div
                      className={fieldStyles.segmented}
                      role="group"
                      aria-label="Enable multiple choice questions"
                    >
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
                            saveValueInLocalStorage(
                              'mcq-enabled',
                              value.toString(),
                              pageId
                            );
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className={fieldStyles.groupIntro}>
                    Photo to deck and the AI chat generate MCQ when this is on.
                    You can also write them yourself with the MCQ syntax — see
                    the{' '}
                    <Link
                      to="/documentation/cards/mcq"
                      className={fieldStyles.groupIntroLink}
                    >
                      docs
                    </Link>
                    .
                  </p>

                  {mcqEnabled && (
                    <>
                      <div className={fieldStyles.section}>
                        <p className={fieldStyles.sectionLabel}>Read aloud</p>
                        <p className={fieldStyles.sectionHint}>
                          Pick a voice for each field. Anki will speak it on the
                          card.
                        </p>

                        {(
                          [
                            {
                              label: 'Question',
                              key: 'mcq-tts-question',
                              value: mcqTtsQuestion,
                              setter: setMcqTtsQuestion,
                            },
                            {
                              label: 'Correct answer',
                              key: 'mcq-tts-correct-answer',
                              value: mcqTtsCorrectAnswer,
                              setter: setMcqTtsCorrectAnswer,
                            },
                            {
                              label: 'Extra',
                              key: 'mcq-tts-extra',
                              value: mcqTtsExtra,
                              setter: setMcqTtsExtra,
                            },
                          ] as const
                        ).map(({ label, key, value, setter }) => (
                          <div key={key} className={fieldStyles.section}>
                            <div className={fieldStyles.labelRow}>
                              <label
                                htmlFor={key}
                                className={fieldStyles.sectionLabel}
                              >
                                {label}
                              </label>
                            </div>
                            <select
                              id={key}
                              className={fieldStyles.deckInput}
                              value={value}
                              onChange={(e) => {
                                setter(e.target.value);
                                saveValueInLocalStorage(
                                  key,
                                  e.target.value,
                                  pageId
                                );
                              }}
                            >
                              {MCQ_TTS_LANGUAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}

                        <p className={fieldStyles.sectionHint}>
                          If your Anki device has no installed voice for the
                          picked language, the audio stays silent.
                        </p>
                        <p className={fieldStyles.sectionHint}>
                          Missing a language? Email{' '}
                          <a href="mailto:support@2anki.net">
                            support@2anki.net
                          </a>{' '}
                          and we&apos;ll add it.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              {isCardTypesGroup && (
                <div className={fieldStyles.optionGroup} id="overlapping-cloze">
                  <div className={fieldStyles.groupHeader}>
                    <h3 className={fieldStyles.groupHeading}>
                      Overlapping cloze
                    </h3>
                    <div
                      className={fieldStyles.segmented}
                      role="group"
                      aria-label="Overlapping cloze"
                    >
                      {(
                        [
                          { label: 'Off', value: 'off' },
                          { label: 'Show the whole list', value: 'show-all' },
                          {
                            label: 'Show nearby lines only',
                            value: 'windowed',
                          },
                        ] as const
                      ).map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!(checkboxValues['cloze'] ?? true)}
                          className={`${fieldStyles.segment} ${overlappingCloze === value ? fieldStyles.segmentActive : ''}`}
                          aria-pressed={overlappingCloze === value}
                          onClick={() => {
                            setOverlappingCloze(value);
                            saveValueInLocalStorage(
                              'overlapping-cloze',
                              value,
                              pageId
                            );
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className={fieldStyles.groupIntro}>
                    Turn a list, poem, or quote into a set of cards that hide
                    one line at a time. Best for ordered things you recite —
                    steps, lyrics, or a passage you're learning by heart.
                  </p>
                  {(checkboxValues['cloze'] ?? true) ? (
                    <>
                      <ul className={fieldStyles.bulletList}>
                        <li>
                          <strong>Show the whole list</strong> — each card hides
                          one item; the rest stays visible as context.
                        </li>
                        <li>
                          <strong>Show nearby lines only</strong> — each card
                          hides one item; only the lines just before and after
                          stay visible.
                        </li>
                      </ul>
                      {overlappingCloze !== 'off' && (
                        <OverlappingClozePreview
                          style={overlappingCloze as 'show-all' | 'windowed'}
                        />
                      )}
                    </>
                  ) : (
                    <p className={fieldStyles.sectionHint}>
                      Turn on Cloze deletion cards first.
                    </p>
                  )}
                </div>
              )}
              {isCardTypesGroup && (
                <GatedToggleRow
                  id="group-cloze-per-toggle"
                  heading="Group cloze blanks per toggle"
                  label="Group cloze blanks per toggle"
                  helperText="When one Notion toggle holds several :: blanks, put them all on a single card and reveal them together. Off by default — each :: makes its own card."
                  prerequisiteHelperText={CLOZE_PREREQUISITE_HELP}
                  checked={checkboxValues['group-cloze-per-toggle'] ?? false}
                  enabled={checkboxValues['cloze'] ?? true}
                  onChange={(checked) =>
                    toggleCheckbox('group-cloze-per-toggle', checked)
                  }
                />
              )}
              {isCardTypesGroup && (
                <GatedToggleRow
                  id="cloze-from-toggle-content"
                  heading="Inline code toggles become cloze"
                  label="Inline code toggles become cloze"
                  helperText="When a toggle's contents contain inline code, hide the code as a cloze and use the toggle header as the hint. Works only when Cloze deletion is on."
                  prerequisiteHelperText={CLOZE_PREREQUISITE_HELP}
                  checked={checkboxValues['cloze-from-toggle-content'] ?? false}
                  enabled={checkboxValues['cloze'] ?? true}
                  onChange={(checked) =>
                    toggleCheckbox('cloze-from-toggle-content', checked)
                  }
                />
              )}
              {isCardTypesGroup && (
                <div className={fieldStyles.optionGroup} id="audio">
                  <h3 className={fieldStyles.groupHeading}>Audio</h3>
                  <p className={fieldStyles.groupIntro}>
                    Two settings, opposite effects. One adds Anki&apos;s
                    built-in voice to your cards. The other hides raw MP3 URLs
                    your source may carry.
                  </p>

                  <div className={fieldStyles.section}>
                    <label className={fieldStyles.toggleRow}>
                      <span className={fieldStyles.toggleSwitch}>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={ttsAutoDetect}
                          onChange={(e) => {
                            setTtsAutoDetect(e.target.checked);
                            saveValueInLocalStorage(
                              'tts-auto-detect',
                              e.target.checked.toString(),
                              pageId
                            );
                          }}
                        />
                        <span
                          className={fieldStyles.toggleSwitchTrack}
                          aria-hidden
                        />
                      </span>
                      <span className={fieldStyles.toggleLabel}>
                        Read cards aloud
                      </span>
                    </label>
                    <p className={fieldStyles.sectionHint}>
                      Adds Anki&apos;s on-device voice to each card. Japanese,
                      Korean, and Chinese are detected automatically; everything
                      else reads in English. No audio file is added to your
                      deck.
                    </p>
                  </div>

                  <div className={fieldStyles.section}>
                    <p className={fieldStyles.sectionLabel}>
                      Pick a voice yourself
                    </p>
                    <p className={fieldStyles.sectionHint}>
                      Choose a language and which side Anki reads. A pick here
                      takes precedence over the automatic detection above.
                    </p>
                    <div className={fieldStyles.section}>
                      <div className={fieldStyles.labelRow}>
                        <label
                          htmlFor="tts-manual-lang"
                          className={fieldStyles.sectionLabel}
                        >
                          Language
                        </label>
                      </div>
                      <select
                        id="tts-manual-lang"
                        className={fieldStyles.deckInput}
                        value={ttsManualLang}
                        onChange={(e) => {
                          setTtsManualLang(e.target.value);
                          saveValueInLocalStorage(
                            'tts-manual-lang',
                            e.target.value,
                            pageId
                          );
                        }}
                      >
                        {MCQ_TTS_LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {ttsManualLang && (
                      <div className={fieldStyles.section}>
                        <p className={fieldStyles.sectionLabel}>Read</p>
                        <div
                          className={fieldStyles.segmented}
                          role="group"
                          aria-label="Read aloud side"
                        >
                          {TTS_MANUAL_SIDE_OPTIONS.map(({ label, value }) => (
                            <button
                              key={value}
                              type="button"
                              className={`${fieldStyles.segment} ${ttsManualSide === value ? fieldStyles.segmentActive : ''}`}
                              aria-pressed={ttsManualSide === value}
                              onClick={() => {
                                setTtsManualSide(value);
                                saveValueInLocalStorage(
                                  'tts-manual-side',
                                  value,
                                  pageId
                                );
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className={fieldStyles.sectionHint}>
                      If your Anki device has no installed voice for the picked
                      language, the audio stays silent.
                    </p>
                  </div>

                  {optionsByKey['remove-mp3-links'] && (
                    <div className={fieldStyles.section}>
                      <label className={fieldStyles.toggleRow}>
                        <span className={fieldStyles.toggleSwitch}>
                          <input
                            type="checkbox"
                            role="switch"
                            checked={
                              checkboxValues['remove-mp3-links'] ?? false
                            }
                            onChange={(e) =>
                              toggleCheckbox(
                                'remove-mp3-links',
                                e.target.checked
                              )
                            }
                          />
                          <span
                            className={fieldStyles.toggleSwitchTrack}
                            aria-hidden
                          />
                        </span>
                        <span className={fieldStyles.toggleLabel}>
                          Remove MP3 links from audio files
                        </span>
                      </label>
                      <p className={fieldStyles.sectionHint}>
                        Hides raw MP3 URLs that appear as visible text on cards.
                        Embedded audio still plays — only the visible link is
                        stripped.
                      </p>
                    </div>
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
                const defaultMapping = getDefaultFieldMapping(t);
                setFieldMapping(defaultMapping);
              }}
            />
          </div>
          {fieldMapping != null && (
            <FieldMappingPanel
              mapping={fieldMapping}
              onChange={(updated) => setFieldMapping(updated)}
            />
          )}
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
          <div className={fieldStyles.section}>
            <TextColorPicker
              textColor={textColor}
              pickedTextColor={(color) => {
                setTextColor(color);
                saveValueInLocalStorage('text-color', color, pageId);
              }}
            />
          </div>
          <div className={fieldStyles.section}>
            <TextAlignPicker
              textAlign={textAlign}
              pickedTextAlign={(align) => {
                setTextAlign(align);
                saveValueInLocalStorage('text-align', align, pageId);
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);
