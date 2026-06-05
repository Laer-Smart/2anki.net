import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  CardOptionsForm,
  CardOptionsFormHandle,
} from '../../components/CardOptionsForm/CardOptionsForm';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { FieldHint } from '../../components/FieldHint';
import Switch from '../../components/input/Switch';
import TemplateSelect from '../../components/TemplateSelect';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import sharedStyles from '../../styles/shared.module.css';
import RuleDefinition from '../SearchPage/components/RuleDefinition';
import { NewRule } from '../SearchPage/types';
import styles from './RulesPage.module.css';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

const flashCardOptions = [
  'paragraph',
  'callout',
  'quote',
  'code',
  'toggle',
  'to_do',
  'bulleted_list_item',
  'numbered_list_item',
  'column_list',
  'table',
  'heading_1',
  'heading_2',
  'heading_3',
];

const newFlashCardOptions = ['table'];
const tagOptions = ['heading', 'strikethrough'];
const subDeckOptions = [
  'child_page',
  'child_database',
  'toggle',
  'heading_1',
  'heading_2',
  'heading_3',
];
const deckOptions = ['page', 'database'];

const defaultRules: NewRule = {
  id: 0,
  owner: 0,
  object_id: '',
  flashcard_is: ['toggle'],
  sub_deck_is: ['child_page'],
  tags_is: 'strikethrough',
  deck_is: ['page', 'database'],
  email_notification: false,
};

type RuleListKey = 'flashcard_is' | 'sub_deck_is' | 'deck_is';

function loadDeckSelection(raw: string | null | undefined): string[] {
  if (raw == null || raw.length === 0) {
    return [...deckOptions];
  }
  const allowed = raw.split(',').filter((v) => deckOptions.includes(v));
  return allowed.length > 0 ? allowed : [...deckOptions];
}

const byLocale = (a: string, b: string) => a.localeCompare(b);

function snapshot(rules: NewRule, tags: string, email: boolean) {
  return JSON.stringify({
    flashcard_is: [...rules.flashcard_is].sort(byLocale),
    sub_deck_is: [...rules.sub_deck_is].sort(byLocale),
    deck_is: [...rules.deck_is].sort(byLocale),
    tags_is: tags,
    email_notification: email,
  });
}

export default function RulesPage({ setErrorMessage }: Readonly<Props>) {
  const { id = '' } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const titleParam = params.get('title');
  const headingTitle = titleParam ? `Rules for ${titleParam}` : 'Rules';
  const parent = titleParam ?? 'this page';
  const type = params.get('type');
  const returnTo = params.get('returnTo') ?? '/notion';

  const [rules, setRules] = useState<NewRule>(defaultRules);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tags, setTags] = useState(defaultRules.tags_is);
  const [sendEmail, setSendEmail] = useState(defaultRules.email_notification);
  const [favorite, setFavorite] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const cardOptionsRef = useRef<CardOptionsFormHandle>(null);

  const currentSnapshot = useMemo(
    () => snapshot(rules, tags, sendEmail),
    [rules, tags, sendEmail]
  );
  const isRulesDirty =
    initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const hasUnsavedChanges = () =>
    isRulesDirty || !!cardOptionsRef.current?.isDirty();

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);
    setInitialSnapshot('');
    setRules(defaultRules);
    setSendEmail(defaultRules.email_notification);
    setTags(defaultRules.tags_is);
    setFavorite(false);

    Promise.all([get2ankiApi().getRules(id), get2ankiApi().getFavorites()])
      .then(([rule, favorites]) => {
        if (cancelled) return;
        const loaded: NewRule = rule
          ? {
              ...rule,
              flashcard_is: rule.flashcard_is.split(',').filter(Boolean),
              sub_deck_is: rule.sub_deck_is
                .split(',')
                .filter((v: string) => subDeckOptions.includes(v)),
              deck_is: loadDeckSelection(rule.deck_is),
            }
          : defaultRules;
        setRules(loaded);
        setSendEmail(loaded.email_notification);
        setTags(loaded.tags_is);
        setFavorite(favorites.some((f) => f.id === id));
        setInitialSnapshot(
          snapshot(loaded, loaded.tags_is, loaded.email_notification)
        );
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(error);
        setLoadFailed(true);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const resetAll = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await Promise.all([
        get2ankiApi().deleteRules(id),
        get2ankiApi().deleteSettings(id),
      ]);
      setRules(defaultRules);
      setTags(defaultRules.tags_is);
      setSendEmail(defaultRules.email_notification);
      setInitialSnapshot(
        snapshot(
          defaultRules,
          defaultRules.tags_is,
          defaultRules.email_notification
        )
      );
      await cardOptionsRef.current?.reset();
    } catch (error) {
      setErrorMessage(error);
    } finally {
      setIsResetting(false);
    }
  };

  const goBack = () => navigate(returnTo);

  const confirmDiscard = () => {
    if (!hasUnsavedChanges()) return true;
    return globalThis.confirm(
      'You have unsaved changes. Leave without saving?'
    );
  };

  const handleBack = () => {
    if (confirmDiscard()) goBack();
  };

  const saveAll = async (
    event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement, MouseEvent>
  ) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    const deckSelection =
      rules.deck_is.length === 0 ? [...deckOptions] : rules.deck_is;

    try {
      await get2ankiApi().saveRules(
        id,
        rules.flashcard_is,
        deckSelection,
        rules.sub_deck_is,
        tags,
        sendEmail
      );
      const cardOptionsOk = await cardOptionsRef.current?.save();
      if (cardOptionsOk === false) {
        setIsSaving(false);
        return;
      }
      goBack();
    } catch (error) {
      setErrorMessage(error);
      setIsSaving(false);
    }
  };

  const toggleSelection = (key: RuleListKey, value: string) => {
    setRules((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((f) => f !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const toggleFavorite = async () => {
    if (isTogglingFavorite) return;
    setIsTogglingFavorite(true);
    const next = !favorite;
    try {
      const ok = favorite
        ? await get2ankiApi().deleteFavorite(id)
        : await get2ankiApi().addFavorite(id, type);
      if (!ok) {
        throw new Error('Failed to update favorite');
      }
      setFavorite(next);
    } catch (error) {
      setErrorMessage(error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  let backLabel = '← Back';
  if (returnTo === '/notion') backLabel = '← Back to Notion';
  else if (returnTo.startsWith('/preview/')) backLabel = '← Back to preview';

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.pageShell}>
        <div className={sharedStyles.page}>
          <header className={sharedStyles.pageHeader}>
            <button
              type="button"
              onClick={handleBack}
              className={styles.backLink}
            >
              {backLabel}
            </button>
            <div className={styles.headerRow}>
              <div className={styles.headerText}>
                <h1 className={sharedStyles.title} data-hj-suppress>
                  {headingTitle}
                </h1>
                <p className={sharedStyles.subtitle}>
                  Settings for this Notion page. Block rules decide what becomes
                  a deck or card. Card options shape the deck itself.
                </p>
              </div>
              <button
                type="button"
                className={`${sharedStyles.btnIcon} ${favorite ? styles.favoriteActive : ''}`}
                onClick={toggleFavorite}
                disabled={isTogglingFavorite || isLoading}
                aria-pressed={favorite}
                aria-label={
                  favorite ? 'Remove from favorites' : 'Favorite this page'
                }
                title={
                  favorite ? 'Remove from favorites' : 'Favorite this page'
                }
              >
                <span aria-hidden="true">{favorite ? '★' : '☆'}</span>
              </button>
            </div>
          </header>

          {isLoading && (
            <div className={`${styles.optionGroup} ${styles.loadingCard}`}>
              <div className={sharedStyles.spinner} />
            </div>
          )}
          {!isLoading && loadFailed && (
            <div className={`${styles.optionGroup} ${styles.loadingCard}`}>
              <p>
                Couldn&apos;t load rules for this page. Check your connection
                and try again.
              </p>
            </div>
          )}
          {!isLoading && !loadFailed && (
            <>
              <section className={styles.optionGroup}>
                <div className={styles.groupHeader}>
                  <h2 className={styles.groupHeading}>Decks and sub-decks</h2>
                  <FieldHint text="Pick which Notion block types create a new deck, and which nest inside as sub-decks." />
                </div>
                <p className={styles.groupHint}>
                  By default, Notion pages and databases become decks. The
                  blocks below nest inside as sub-decks.
                </p>

                <div className={styles.section}>
                  <div className={styles.labelRow}>
                    <span className={styles.sectionLabel}>Deck boundaries</span>
                    <FieldHint text="Notion block types that start a new deck. Defaults to page and database." />
                  </div>
                  <RuleDefinition
                    value={rules.deck_is}
                    options={deckOptions}
                    onSelected={(fco) => toggleSelection('deck_is', fco)}
                  />
                </div>

                <div className={styles.section}>
                  <div className={styles.labelRow}>
                    <span className={styles.sectionLabel}>Sub-decks</span>
                    <FieldHint text="Notion block types that nest inside a deck as a sub-deck." />
                  </div>
                  <RuleDefinition
                    value={rules.sub_deck_is}
                    options={subDeckOptions}
                    onSelected={(fco) => toggleSelection('sub_deck_is', fco)}
                  />
                </div>
              </section>

              <section className={styles.optionGroup}>
                <div className={styles.groupHeader}>
                  <h2 className={styles.groupHeading}>Flashcards</h2>
                  <FieldHint text="Notion blocks that become individual cards." />
                </div>
                <RuleDefinition
                  value={rules.flashcard_is}
                  options={flashCardOptions}
                  newOptions={newFlashCardOptions}
                  onSelected={(fco) => toggleSelection('flashcard_is', fco)}
                />
              </section>

              <section className={styles.optionGroup}>
                <div className={styles.groupHeader}>
                  <h2 className={styles.groupHeading}>
                    Tags and notifications
                  </h2>
                  <FieldHint text="How tags are detected and when 2anki emails you." />
                </div>

                <div className={styles.section}>
                  <div className={styles.labelRow}>
                    <label
                      htmlFor="tags-format"
                      className={styles.sectionLabel}
                    >
                      Tag format
                    </label>
                    <FieldHint text="The Notion styling that marks a block as a tag." />
                  </div>
                  <TemplateSelect
                    data-hj-suppress
                    pickedTemplate={(name: string) => setTags(name)}
                    values={tagOptions.map((fco) => ({
                      label: `Tags are ${fco}`,
                      value: fco,
                    }))}
                    name="tags-format"
                    value={tags}
                  />
                </div>

                <div className={styles.switchRow}>
                  <Switch
                    id="email-notification"
                    title="Email the deck when it's ready"
                    checked={sendEmail}
                    onSwitched={() => setSendEmail((prev) => !prev)}
                  />
                  <FieldHint text="Sends the .apkg as an attachment for decks under 24 MB. Larger decks always email a download link." />
                </div>
              </section>

              <div className={styles.formHeader}>
                <hr className={styles.divider} />
                <h2 className={styles.formHeading}>Card options</h2>
                <p className={sharedStyles.smallDescription}>
                  Change the deck name, templates, and conversion for this page
                  only. <Link to="/card-options">Edit your defaults</Link> to
                  change every page.
                </p>
              </div>
              <CardOptionsForm
                ref={cardOptionsRef}
                pageId={id}
                pageTitle={parent}
                setError={setErrorMessage}
                hideActions
              />

              <div className={styles.saveBar}>
                <button
                  type="button"
                  className={`${sharedStyles.btnSecondary} ${styles.actionButton}`}
                  onClick={resetAll}
                  disabled={isSaving || isResetting}
                >
                  {isResetting ? 'Resetting' : 'Reset to defaults'}
                </button>
                <button
                  type="button"
                  className={`${sharedStyles.btnSecondary} ${styles.actionButton}`}
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${sharedStyles.btnPrimary} ${styles.actionButton}`}
                  onClick={saveAll}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving' : 'Save changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
