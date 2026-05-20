import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  AIChatMessage,
  AiQuotaExceededError,
  AnkiNoteType,
  NoteTypeStarter,
  aiGenerateNoteType,
  aiModifyNoteType,
  downloadNoteTypeApkg,
  getDefaultNoteTypes,
  getOfficialNoteTypes,
  getUserTemplates,
  saveUserTemplate,
} from '../../lib/backend/templates';
import sharedStyles from '../../styles/shared.module.css';
import editorStyles from './EditorPage.module.css';
import galleryStyles from './TemplatesPage.module.css';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { BaseType, buildEmptyNoteType, duplicateStarter } from './lib/buildNoteType';
import {
  addField as addFieldOp,
  removeField as removeFieldOp,
  renameField as renameFieldOp,
  setPreviewValue as setPreviewValueOp,
} from './lib/editFields';
import { buildPreviewDocument } from './renderNoteTypePreview';

type Pane = 'front' | 'back' | 'css';

function safeFilename(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'note-type';
  return trimmed.replace(/[^A-Za-z0-9\-_ ]/g, '_');
}

function fingerprintStarter(s: NoteTypeStarter): string {
  const nt = s.noteType;
  return JSON.stringify({
    name: s.name,
    description: s.description,
    baseType: s.baseType,
    css: nt.css,
    type: nt.type,
    flds: nt.flds.map((f) => ({ name: f.name, ord: f.ord })),
    tmpls: nt.tmpls.map((t) => ({
      name: t.name,
      ord: t.ord,
      qfmt: t.qfmt,
      afmt: t.afmt,
    })),
  });
}

function getSaveLabel(saving: boolean, shouldFork: boolean): string {
  if (saving) return 'Saving…';
  return shouldFork ? 'Save as copy' : 'Save';
}

interface PresetPickerProps {
  loading: boolean;
  presets: NoteTypeStarter[];
  onPick: (pick: NoteTypeStarter | BaseType) => void;
}

function PresetPicker({
  loading,
  presets,
  onPick,
}: Readonly<PresetPickerProps>) {
  return (
    <div className={sharedStyles.page}>
      <Helmet>
        <title>New note type — 2anki</title>
      </Helmet>
      <header className={sharedStyles.pageHeader}>
        <h1 className={sharedStyles.title}>Start a new note type</h1>
        <p className={sharedStyles.subtitle}>
          Pick a starting point. You can rename, edit, and reshape it before saving.
        </p>
      </header>

      <AIGenerateSection onGenerated={onPick} />

      <section
        className={editorStyles.presetSection}
        aria-labelledby="preset-starter-heading"
      >
        <h2
          id="preset-starter-heading"
          className={editorStyles.presetHeading}
        >
          From a starter
        </h2>
        {loading && (
          <p className={editorStyles.presetEmpty}>Loading starters…</p>
        )}
        {!loading && presets.length === 0 && (
          <p className={editorStyles.presetEmpty}>
            No starter templates available right now.
          </p>
        )}
        {presets.length > 0 && (
          <div className={editorStyles.presetGrid}>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={editorStyles.presetCard}
                onClick={() => onPick(preset)}
              >
                <span className={editorStyles.presetName}>{preset.name}</span>
                <span className={editorStyles.presetDescription}>
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section
        className={editorStyles.presetSection}
        aria-labelledby="preset-blank-heading"
      >
        <h2 id="preset-blank-heading" className={editorStyles.presetHeading}>
          From scratch
        </h2>
        <div className={editorStyles.presetGrid}>
          <button
            type="button"
            className={editorStyles.presetCard}
            onClick={() => onPick('basic')}
          >
            <span className={editorStyles.presetName}>Blank Basic</span>
            <span className={editorStyles.presetDescription}>
              Two fields (Front, Back), one card. Sensible default styles.
            </span>
          </button>
          <button
            type="button"
            className={editorStyles.presetCard}
            onClick={() => onPick('cloze')}
          >
            <span className={editorStyles.presetName}>Blank Cloze</span>
            <span className={editorStyles.presetDescription}>
              Cloze deletion with a Text + Extra field. One card per cloze.
            </span>
          </button>
        </div>
      </section>

      <Link to="/templates" className={editorStyles.presetBack}>
        ← Back to Note types
      </Link>
    </div>
  );
}

interface AIGenerateSectionProps {
  onGenerated: (pick: NoteTypeStarter) => void;
}

function AIGenerateSection({ onGenerated }: Readonly<AIGenerateSectionProps>) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaUpgradeUrl, setQuotaUpgradeUrl] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    setQuotaUpgradeUrl(null);
    try {
      const result = await aiGenerateNoteType(prompt);
      onGenerated(result.starter);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not generate');
      if (err instanceof AiQuotaExceededError) {
        setQuotaUpgradeUrl(err.upgradeUrl);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={editorStyles.presetSection}
      aria-labelledby="preset-ai-heading"
    >
      <h2 id="preset-ai-heading" className={editorStyles.presetHeading}>
        Describe your note type
      </h2>
      <p className={editorStyles.presetSubtitle}>
        Tell us what fields you want. We'll draft a starting point you can edit
        and preview.
      </p>
      <div className={editorStyles.aiPromptRow}>
        <input
          className={editorStyles.aiPromptInput}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Japanese vocabulary — kanji, hiragana reading, English meaning, pitch-accent diagram"
          aria-label="Describe the note type"
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !busy && prompt.trim().length > 0) {
              onSubmit();
            }
          }}
        />
        <button
          type="button"
          className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
          onClick={onSubmit}
          disabled={busy || prompt.trim().length === 0}
        >
          {busy ? 'Drafting…' : 'Draft it'}
        </button>
      </div>
      {error && (
        <p className={editorStyles.aiError} role="alert">
          {error}
          {quotaUpgradeUrl && (
            <>
              {' '}
              <Link
                to={quotaUpgradeUrl}
                className={editorStyles.aiUpgradeLink}
              >
                See pricing →
              </Link>
            </>
          )}
        </p>
      )}
    </section>
  );
}

async function findStarter(id: string): Promise<NoteTypeStarter | null> {
  const [defaults, official, user] = await Promise.all([
    getDefaultNoteTypes().catch(() => []),
    getOfficialNoteTypes().catch(() => []),
    getUserTemplates().catch(() => ({ templates: [], hiddenIds: [] })),
  ]);
  const all = [...user.templates, ...official, ...defaults];
  return all.find((s) => s.id === id) ?? null;
}

interface EditorBodyProps {
  initialStarter: NoteTypeStarter;
  shouldFork: boolean;
}

function EditorBody({
  initialStarter,
  shouldFork,
}: Readonly<EditorBodyProps>) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<NoteTypeStarter>(initialStarter);
  const [pane, setPane] = useState<Pane>('front');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatUpgradeUrl, setChatUpgradeUrl] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<{
    instruction: string;
    history: AIChatMessage[];
  } | null>(null);

  useEffect(() => {
    setDraft(initialStarter);
  }, [initialStarter]);

  const previewSide: 'front' | 'back' = pane === 'back' ? 'back' : 'front';
  const previewDoc = useMemo(
    () => buildPreviewDocument(draft.noteType, draft.previewData, previewSide),
    [draft, previewSide]
  );

  const updateNoteType = useCallback((updater: (n: AnkiNoteType) => AnkiNoteType) => {
    setDraft((current) => ({ ...current, noteType: updater(current.noteType) }));
  }, []);

  const setQfmt = (value: string) => {
    updateNoteType((n) => ({
      ...n,
      tmpls: n.tmpls.map((t, i) => (i === 0 ? { ...t, qfmt: value } : t)),
    }));
  };
  const setAfmt = (value: string) => {
    updateNoteType((n) => ({
      ...n,
      tmpls: n.tmpls.map((t, i) => (i === 0 ? { ...t, afmt: value } : t)),
    }));
  };
  const setCss = (value: string) => {
    updateNoteType((n) => ({ ...n, css: value }));
  };

  const handleNameChange = (value: string) => {
    setDraft((current) => ({
      ...current,
      name: value,
      noteType: { ...current.noteType, name: value },
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setDraft((current) => ({ ...current, description: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const starterToSave = shouldFork ? duplicateStarter(draft) : draft;
      await saveUserTemplate(starterToSave);
      setSavedAt(Date.now());
      if (starterToSave.id !== draft.id) {
        navigate(`/templates/edit/${encodeURIComponent(starterToSave.id)}`, {
          replace: true,
        });
      }
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : 'Could not save template'
      );
    } finally {
      setSaving(false);
    }
  };

  const performModify = async (
    instruction: string,
    historyBeforeUser: AIChatMessage[]
  ) => {
    setChatBusy(true);
    setChatError(null);
    setChatUpgradeUrl(null);
    setLastAttempt({ instruction, history: historyBeforeUser });
    const before = fingerprintStarter(draft);
    try {
      const result = await aiModifyNoteType(
        draft,
        instruction,
        historyBeforeUser
      );
      const after = fingerprintStarter(result.starter);
      setDraft((current) => ({
        ...current,
        name: result.starter.name,
        description: result.starter.description,
        baseType: result.starter.baseType,
        noteType: result.starter.noteType,
        previewData: result.starter.previewData,
      }));
      const reply =
        before === after
          ? 'Nothing changed. Try a more specific instruction.'
          : result.reply || 'Updated.';
      setChatHistory([
        ...historyBeforeUser,
        { role: 'user', content: instruction },
        { role: 'assistant', content: reply },
      ]);
      setLastAttempt(null);
    } catch (error: unknown) {
      setChatError(
        error instanceof Error ? error.message : 'Claude could not respond'
      );
      if (error instanceof AiQuotaExceededError) {
        setChatUpgradeUrl(error.upgradeUrl);
      }
    } finally {
      setChatBusy(false);
    }
  };

  const handleSendChat = async () => {
    const instruction = chatInput.trim();
    if (instruction.length === 0 || chatBusy) return;
    const historyBeforeUser = chatHistory;
    setChatInput('');
    setChatHistory([
      ...historyBeforeUser,
      { role: 'user', content: instruction },
    ]);
    await performModify(instruction, historyBeforeUser);
  };

  const handleRetry = async () => {
    if (!lastAttempt || chatBusy) return;
    await performModify(lastAttempt.instruction, lastAttempt.history);
  };

  const handleDownload = async () => {
    try {
      const blob = await downloadNoteTypeApkg(draft.noteType, draft.previewData);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeFilename(draft.name)}.apkg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not generate .apkg — try again.'
      );
    }
  };

  const template = draft.noteType.tmpls[0];
  const activeValueByPane: Record<Pane, string> = {
    front: template.qfmt,
    back: template.afmt,
    css: draft.noteType.css,
  };
  const setActiveValueByPane: Record<Pane, (value: string) => void> = {
    front: setQfmt,
    back: setAfmt,
    css: setCss,
  };
  const activeValue = activeValueByPane[pane];
  const setActiveValue = setActiveValueByPane[pane];
  const activeLanguage: 'html' | 'css' = pane === 'css' ? 'css' : 'html';

  return (
    <div className={editorStyles.layout}>
      <header className={editorStyles.header}>
        <div className={editorStyles.headerLeft}>
          <Link to="/templates" className={editorStyles.backLink}>
            ← Note types
          </Link>
          <input
            className={editorStyles.nameInput}
            value={draft.name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Template name"
            aria-label="Template name"
          />
        </div>
        <div className={editorStyles.headerActions}>
          {saveError && (
            <span className={editorStyles.error} role="alert">
              {saveError}
            </span>
          )}
          {savedAt && !saveError && (
            <span className={editorStyles.savedHint}>Saved</span>
          )}
          <button
            type="button"
            className={sharedStyles.btnSecondary}
            onClick={handleDownload}
          >
            Download .apkg
          </button>
          <button
            type="button"
            className={sharedStyles.btnPrimary}
            onClick={handleSave}
            disabled={saving}
          >
            {getSaveLabel(saving, shouldFork)}
          </button>
        </div>
      </header>

      <div className={editorStyles.descriptionRow}>
        <input
          className={editorStyles.descriptionInput}
          value={draft.description}
          onChange={(event) => handleDescriptionChange(event.target.value)}
          placeholder="One-line description (optional)"
          aria-label="Description"
        />
      </div>

      <div className={editorStyles.fieldsSection}>
        <div className={editorStyles.fieldsHeader}>
          <span className={editorStyles.fieldsLabel}>Fields</span>
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
            onClick={() => setDraft((current) => addFieldOp(current))}
          >
            + Add field
          </button>
        </div>
        <div className={editorStyles.fieldsList}>
          {draft.noteType.flds.map((field, index) => (
            <div key={`${field.ord}-${field.name}`} className={editorStyles.fieldRow}>
              <input
                className={editorStyles.fieldNameInput}
                value={field.name}
                onChange={(event) =>
                  setDraft((current) =>
                    renameFieldOp(current, index, event.target.value)
                  )
                }
                aria-label={`Field ${index + 1} name`}
              />
              <input
                className={editorStyles.fieldPreviewInput}
                value={draft.previewData[field.name] ?? ''}
                onChange={(event) =>
                  setDraft((current) =>
                    setPreviewValueOp(current, field.name, event.target.value)
                  )
                }
                placeholder={`${field.name} preview value`}
                aria-label={`${field.name} preview value`}
              />
              <button
                type="button"
                className={`${sharedStyles.btnSecondary} ${editorStyles.fieldRemove}`}
                onClick={() =>
                  setDraft((current) => removeFieldOp(current, index))
                }
                disabled={draft.noteType.flds.length <= 1}
                aria-label={`Remove ${field.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={editorStyles.workspace}>
        <div className={editorStyles.editorPane}>
          <div
            className={editorStyles.tabs}
            role="tablist"
            aria-label="Edit panes"
          >
            {(['front', 'back', 'css'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={pane === value}
                className={`${editorStyles.tab} ${pane === value ? editorStyles.tabActive : ''}`}
                onClick={() => setPane(value)}
              >
                {value === 'front' && 'Front'}
                {value === 'back' && 'Back'}
                {value === 'css' && 'Styling'}
              </button>
            ))}
          </div>
          <div className={editorStyles.editorBox}>
            <CodeEditor
              language={activeLanguage}
              value={activeValue}
              onChange={setActiveValue}
              ariaLabel={`${pane} editor`}
            />
          </div>
        </div>

        <div className={editorStyles.previewPane}>
          <div className={editorStyles.previewLabel}>
            Live preview &mdash; {previewSide}
          </div>
          <div className={editorStyles.previewFrameWrap}>
            <iframe
              title={`${draft.name} ${previewSide} preview`}
              className={editorStyles.previewFrame}
              sandbox=""
              srcDoc={previewDoc}
            />
          </div>
          <div className={editorStyles.chatPanel}>
            <div className={editorStyles.previewLabel}>Ask Claude</div>
            <div
              className={editorStyles.chatHistory}
              aria-live="polite"
              aria-atomic="false"
            >
              {chatHistory.length === 0 && !chatBusy && (
                <p className={editorStyles.chatEmpty}>
                  Try: "Make the back darker", "Add a hint field", "Use a serif
                  font for the question."
                </p>
              )}
              {chatHistory.map((message, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className={`${editorStyles.chatBubble} ${message.role === 'user' ? editorStyles.chatBubbleUser : editorStyles.chatBubbleAssistant}`}
                >
                  {message.content}
                </div>
              ))}
              {chatBusy && (
                <div
                  className={`${editorStyles.chatBubble} ${editorStyles.chatBubbleAssistant} ${editorStyles.chatPending}`}
                >
                  Thinking…
                </div>
              )}
            </div>
            {chatError && (
              <p className={editorStyles.aiError} role="alert">
                {chatError}
                {chatUpgradeUrl && (
                  <>
                    {' '}
                    <Link
                      to={chatUpgradeUrl}
                      className={editorStyles.aiUpgradeLink}
                    >
                      See pricing →
                    </Link>
                  </>
                )}
                {!chatUpgradeUrl && lastAttempt && (
                  <>
                    {' '}
                    <button
                      type="button"
                      className={editorStyles.aiRetryButton}
                      onClick={handleRetry}
                      disabled={chatBusy}
                    >
                      Try again
                    </button>
                  </>
                )}
              </p>
            )}
            <div className={editorStyles.chatInputRow}>
              <input
                className={editorStyles.chatInput}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask Claude to change something"
                disabled={chatBusy}
                aria-label="Ask Claude"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendChat();
                  }
                }}
              />
              <button
                type="button"
                className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
                onClick={handleSendChat}
                disabled={chatBusy || chatInput.trim().length === 0}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditorPageProps {
  mode: 'new' | 'edit';
}

export function EditorPage({ mode }: Readonly<EditorPageProps>) {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<NoteTypeStarter | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shouldFork, setShouldFork] = useState(false);
  const [presetOptions, setPresetOptions] = useState<NoteTypeStarter[] | null>(
    null
  );
  const [pickedPreset, setPickedPreset] = useState<
    NoteTypeStarter | BaseType | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    if (mode === 'new') {
      if (pickedPreset == null) {
        getDefaultNoteTypes()
          .then((defaults) => {
            if (!cancelled) setPresetOptions(defaults);
          })
          .catch(() => {
            if (!cancelled) setPresetOptions([]);
          });
        return;
      }
      if (pickedPreset === 'basic' || pickedPreset === 'cloze') {
        setInitial(buildEmptyNoteType(pickedPreset));
      } else {
        setInitial(duplicateStarter(pickedPreset));
      }
      setShouldFork(false);
      return;
    }
    if (!id) {
      setLoadError('Missing template id');
      return;
    }
    setLoadError(null);
    findStarter(id)
      .then(async (starter) => {
        if (cancelled) return;
        if (!starter) {
          setLoadError('Template not found');
          return;
        }
        const userPayload = await getUserTemplates().catch(() => ({
          templates: [],
          hiddenIds: [],
        }));
        const owned = userPayload.templates.some((t) => t.id === starter.id);
        setShouldFork(!owned);
        setInitial(starter);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : 'Could not load template'
        );
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id, pickedPreset]);

  if (loadError) {
    return (
      <div className={sharedStyles.page}>
        <p className={galleryStyles.error} role="alert">
          {loadError}
        </p>
        <Link to="/templates" className={sharedStyles.btnSecondary}>
          Back to Note types
        </Link>
      </div>
    );
  }

  if (mode === 'new' && pickedPreset == null) {
    return (
      <PresetPicker
        loading={presetOptions == null}
        presets={presetOptions ?? []}
        onPick={setPickedPreset}
      />
    );
  }

  if (!initial) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.spinner ?? ''} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {mode === 'new' ? 'New note type' : `Edit ${initial.name}`} — 2anki
        </title>
      </Helmet>
      <EditorBody initialStarter={initial} shouldFork={shouldFork} />
    </>
  );
}

export default EditorPage;
