import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend, LeechNote } from '../../../lib/backend/Backend';
import DotsHorizontal from '../../../components/icons/DotsHorizontal';
import { stripHtmlTags } from '../../../lib/text/stripHtmlTags';
import { track } from '../../../lib/analytics/track';

const LEECHES_KEY = ['ankify-leeches'];
const PREVIEW_LIMIT = 80;
const FLASH_DURATION_MS = 4_000;

interface Props {
  readonly backend?: Backend;
}

const truncate = (value: string): string =>
  value.length <= PREVIEW_LIMIT ? value : `${value.slice(0, PREVIEW_LIMIT)}…`;

const fieldByName = (leech: LeechNote, name: string): string =>
  leech.fields.find((field) => field.name === name)?.value ?? '';

const isBasicFrontBack = (leech: LeechNote): boolean => {
  const names = leech.fields.map((field) => field.name);
  return (
    names.length === 2 && names.includes('Front') && names.includes('Back')
  );
};

const previewText = (leech: LeechNote): string => {
  const front = isBasicFrontBack(leech)
    ? fieldByName(leech, 'Front')
    : (leech.fields[0]?.value ?? '');
  return stripHtmlTags(front);
};

const backPreviewText = (leech: LeechNote): string => {
  const back = isBasicFrontBack(leech)
    ? fieldByName(leech, 'Back')
    : (leech.fields[1]?.value ?? '');
  return stripHtmlTags(back);
};

interface RowFlash {
  kind: 'success' | 'error';
  text: string;
}

export default function LeechesPanel({ backend }: Props) {
  const { t } = useTranslation('ankify');
  const api = backend ?? get2ankiApi();
  const queryClient = useQueryClient();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editorId, setEditorId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [flashByRow, setFlashByRow] = useState<Record<number, RowFlash>>({});
  const menuContainerRef = useRef<HTMLUListElement | null>(null);
  const flashTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(
    () => () => {
      flashTimers.current.forEach((handle) => clearTimeout(handle));
      flashTimers.current.clear();
    },
    []
  );

  const showFlash = useCallback((id: number, flash: RowFlash) => {
    setFlashByRow((prev) => ({ ...prev, [id]: flash }));
    const previousTimer = flashTimers.current.get(id);
    if (previousTimer != null) clearTimeout(previousTimer);
    const handle = setTimeout(() => {
      flashTimers.current.delete(id);
      setFlashByRow((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
    }, FLASH_DURATION_MS);
    flashTimers.current.set(id, handle);
  }, []);

  const leeches = useQuery({
    queryKey: LEECHES_KEY,
    queryFn: () => api.listAnkifyLeeches(),
  });

  useEffect(() => {
    if (leeches.data?.connected === true) {
      track('ankify_leeches_viewed', {
        count: leeches.data.leeches.length,
      });
    }
  }, [leeches.data]);

  const editLeech = useMutation({
    mutationFn: (args: { noteId: number; front: string; back: string }) =>
      api.editAnkifyLeech(args.noteId, {
        Front: args.front,
        Back: args.back,
      }),
    onSuccess: (_data, args) => {
      track('ankify_leech_action', { action: 'edit' });
      setEditorId(null);
      showFlash(args.noteId, {
        kind: 'success',
        text: t('leeches.flash.saved'),
      });
      queryClient.invalidateQueries({ queryKey: LEECHES_KEY });
    },
    onError: (_err, args) => {
      showFlash(args.noteId, {
        kind: 'error',
        text: t('leeches.flash.saveError'),
      });
    },
  });

  const deleteLeech = useMutation({
    mutationFn: (noteId: number) => api.deleteAnkifyLeech(noteId),
    onSuccess: (_data, noteId) => {
      track('ankify_leech_action', { action: 'delete' });
      setConfirmDeleteId(null);
      showFlash(noteId, {
        kind: 'success',
        text: t('leeches.flash.deleted'),
      });
      queryClient.invalidateQueries({ queryKey: LEECHES_KEY });
    },
    onError: (_err, noteId) => {
      showFlash(noteId, {
        kind: 'error',
        text: t('leeches.flash.deleteError'),
      });
    },
  });

  const returnToReview = useMutation({
    mutationFn: (noteId: number) => api.returnAnkifyLeechToReview(noteId),
    onSuccess: (_data, noteId) => {
      track('ankify_leech_action', { action: 'return_to_review' });
      showFlash(noteId, {
        kind: 'success',
        text: t('leeches.flash.backInReview'),
      });
      queryClient.invalidateQueries({ queryKey: LEECHES_KEY });
    },
    onError: (_err, noteId) => {
      showFlash(noteId, {
        kind: 'error',
        text: t('leeches.flash.updateError'),
      });
    },
  });

  const openEditor = (leech: LeechNote) => {
    setOpenMenuId(null);
    setConfirmDeleteId(null);
    setEditorId(leech.noteId);
    setEditFront(fieldByName(leech, 'Front'));
    setEditBack(fieldByName(leech, 'Back'));
  };

  const openDeckInAnki = useCallback(
    async (noteId: number, deck: string) => {
      setOpenMenuId(null);
      try {
        const result = await api.openAnkifyDeckInAnki(deck);
        showFlash(noteId, {
          kind: result.opened ? 'success' : 'error',
          text: result.opened
            ? t('leeches.flash.opened')
            : t('leeches.flash.openError'),
        });
      } catch {
        showFlash(noteId, {
          kind: 'error',
          text: t('leeches.flash.openError'),
        });
      }
    },
    [api, showFlash, t]
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(target)
      ) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId != null) {
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }
    return undefined;
  }, [openMenuId]);

  if (leeches.isLoading) {
    return (
      <div
        role="tabpanel"
        id="ankify-tabpanel-leeches"
        aria-labelledby="ankify-tab-leeches"
        className={styles.tabPanel}
      >
        <p className={styles.emptyLine}>{t('leeches.reading')}</p>
      </div>
    );
  }

  if (leeches.data?.connected !== true) {
    return (
      <div
        role="tabpanel"
        id="ankify-tabpanel-leeches"
        aria-labelledby="ankify-tab-leeches"
        className={styles.tabPanel}
      >
        <p className={styles.emptyLine}>{t('leeches.notConnected')}</p>
        <div className={styles.offlineActions}>
          <button
            type="button"
            className={sharedStyles.btnGhost}
            onClick={() => leeches.refetch()}
          >
            {t('leeches.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  const rows = leeches.data.leeches;

  if (rows.length === 0) {
    return (
      <div
        role="tabpanel"
        id="ankify-tabpanel-leeches"
        aria-labelledby="ankify-tab-leeches"
        className={styles.tabPanel}
      >
        <p className={styles.emptyLine}>{t('leeches.empty')}</p>
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="ankify-tabpanel-leeches"
      aria-labelledby="ankify-tab-leeches"
      className={styles.tabPanel}
    >
      <p className={styles.decksHelper}>{t('leeches.helper')}</p>
      <ul className={styles.decksList} ref={menuContainerRef}>
        {rows.map((leech) => {
          const front = previewText(leech);
          const back = backPreviewText(leech);
          const editable = isBasicFrontBack(leech);
          const flash = flashByRow[leech.noteId] ?? null;
          const title = front.length > 0 ? front : t('leeches.untitledCard');
          return (
            <Fragment key={leech.noteId}>
              <li className={styles.decksItem}>
                <span
                  className={`${styles.decksItemDot} ${styles.decksItemDotSyncing}`}
                  aria-hidden="true"
                />
                <span className={styles.decksItemTitle} title={front}>
                  {title}
                  {back.length > 0 && (
                    <span className={styles.leechBack} title={back}>
                      → {truncate(back)}
                    </span>
                  )}
                </span>
                <span className={styles.decksItemData} aria-live="polite">
                  {leech.deckName.length > 0 && (
                    <span
                      className={styles.decksItemDeckPath}
                      title={leech.deckName}
                    >
                      {leech.deckName}
                    </span>
                  )}
                  <span
                    className={styles.leechLapses}
                    title={t('leeches.lapses', { count: leech.lapses })}
                  >
                    ⌗{leech.lapses}
                  </span>
                  {flash != null && (
                    <span
                      className={
                        flash.kind === 'success'
                          ? styles.muted
                          : styles.decksItemErrorDanger
                      }
                    >
                      {flash.text}
                    </span>
                  )}
                </span>
                <div className={styles.decksItemRowMenu}>
                  <button
                    type="button"
                    className={sharedStyles.btnIcon}
                    aria-label={t('leeches.options', { title })}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === leech.noteId}
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === leech.noteId ? null : leech.noteId
                      )
                    }
                  >
                    <DotsHorizontal width={16} height={16} />
                  </button>
                  {openMenuId === leech.noteId && (
                    <div role="menu" className={styles.decksItemMenu}>
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.decksItemMenuItem}
                        onClick={() => {
                          if (editable) {
                            openEditor(leech);
                          } else {
                            openDeckInAnki(leech.noteId, leech.deckName);
                          }
                        }}
                      >
                        {t('leeches.editCard')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.decksItemMenuItem}
                        onClick={() => {
                          setOpenMenuId(null);
                          returnToReview.mutate(leech.noteId);
                        }}
                        disabled={returnToReview.isPending}
                      >
                        {t('leeches.returnToReview')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.decksItemMenuItemDanger}
                        onClick={() => {
                          setOpenMenuId(null);
                          setEditorId(null);
                          setConfirmDeleteId(leech.noteId);
                        }}
                      >
                        {t('leeches.deleteCard')}
                      </button>
                    </div>
                  )}
                </div>
              </li>
              {editorId === leech.noteId && (
                <li className={styles.zeroBanner}>
                  {editable ? (
                    <form
                      className={styles.deckLocationForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        editLeech.mutate({
                          noteId: leech.noteId,
                          front: editFront,
                          back: editBack,
                        });
                      }}
                    >
                      <label htmlFor={`leech-front-${leech.noteId}`}>
                        {t('leeches.front')}
                      </label>
                      <textarea
                        id={`leech-front-${leech.noteId}`}
                        className={styles.leechField}
                        value={editFront}
                        onChange={(event) => setEditFront(event.target.value)}
                      />
                      <label htmlFor={`leech-back-${leech.noteId}`}>
                        {t('leeches.back')}
                      </label>
                      <textarea
                        id={`leech-back-${leech.noteId}`}
                        className={styles.leechField}
                        value={editBack}
                        onChange={(event) => setEditBack(event.target.value)}
                      />
                      <p className={styles.deckLocationHelp}>
                        {t('leeches.editHelp')}
                      </p>
                      <div className={styles.deckLocationActions}>
                        <button
                          type="submit"
                          className={sharedStyles.btnPrimary}
                          disabled={editLeech.isPending}
                        >
                          {t('leeches.saveCard')}
                        </button>
                        <button
                          type="button"
                          className={sharedStyles.btnGhost}
                          onClick={() => setEditorId(null)}
                        >
                          {t('leeches.cancel')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className={styles.zeroBannerText}>
                      {t('leeches.tooManyFields')}
                    </p>
                  )}
                </li>
              )}
              {confirmDeleteId === leech.noteId && (
                <li className={styles.zeroBanner}>
                  <div className={styles.leechConfirm}>
                    <span>{t('leeches.confirmDelete')}</span>
                    <button
                      type="button"
                      className={styles.leechConfirmDanger}
                      onClick={() => deleteLeech.mutate(leech.noteId)}
                      disabled={deleteLeech.isPending}
                    >
                      {t('leeches.delete')}
                    </button>
                    <button
                      type="button"
                      className={sharedStyles.btnGhost}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      {t('leeches.cancel')}
                    </button>
                  </div>
                </li>
              )}
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
