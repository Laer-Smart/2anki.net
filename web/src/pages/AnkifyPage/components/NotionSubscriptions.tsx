import { Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend } from '../../../lib/backend/Backend';
import NotionPagePicker from './NotionPagePicker';
import DotsHorizontal from '../../../components/icons/DotsHorizontal';
import { BlockIcon } from '../../SearchPage/components/BlockIcon';
import { mapSubscribeError } from './mapSubscribeError';

const formatRelativeTime = (iso: string | null | undefined): string | null => {
  if (iso == null || iso.length === 0) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDistanceToNow(parsed, { addSuffix: true });
};

type Schedule = Awaited<ReturnType<Backend['getAnkifyExportSchedule']>>;

interface Props {
  readonly backend?: Backend;
  readonly schedule?: Schedule;
}

const formatScheduleTime = (
  timeOfDay: string,
  timezone: string
): string | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(timeOfDay);
  if (match == null) return null;
  const targetHours = Number(match[1]);
  const targetMinutes = Number(match[2]);
  const sample = new Date();
  sample.setUTCHours(targetHours, targetMinutes, 0, 0);
  const probe = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    probe
      .formatToParts(sample)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  const seenHours = Number(parts.hour);
  const seenMinutes = Number(parts.minute);
  if (Number.isNaN(seenHours) || Number.isNaN(seenMinutes)) return null;
  const diffMinutes =
    targetHours * 60 + targetMinutes - (seenHours * 60 + seenMinutes);
  const adjusted = new Date(sample.getTime() + diffMinutes * 60_000);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(adjusted);
};

const SUBSCRIPTIONS_KEY = ['ankify-subscriptions'];
const CONFLICTS_KEY = ['ankify-conflicts'];
const SEARCH_THRESHOLD = 10;
const FLASH_DURATION_MS = 4_000;

interface RowFlash {
  kind: 'success' | 'error' | 'conflict';
  text: string;
}

interface ZeroDiagnostic {
  blocks_scanned: number;
  blocks_matched: number;
  unmatched_samples?: string[];
}

const buildSuccessFlash = (result: {
  created: number;
  updated: number;
  conflicts: number;
  diagnostic: ZeroDiagnostic | null | undefined;
}): RowFlash => {
  if (result.conflicts > 0) {
    return {
      kind: 'conflict',
      text: 'Needs a decision — see banner above',
    };
  }
  if (result.created + result.updated === 0) {
    if (result.diagnostic != null && result.diagnostic.blocks_matched === 0) {
      return { kind: 'success', text: 'No patterns found' };
    }
    return { kind: 'success', text: 'Already up to date' };
  }
  const cardWord = result.created === 1 ? 'card' : 'cards';
  if (result.updated === 0) {
    return {
      kind: 'success',
      text: `Updated · ${result.created} new ${cardWord}`,
    };
  }
  if (result.created === 0) {
    return {
      kind: 'success',
      text: `Updated · ${result.updated} changed`,
    };
  }
  return {
    kind: 'success',
    text: `Updated · ${result.created} new, ${result.updated} changed`,
  };
};

const extractZeroDiagnostic = (result: {
  created: number;
  updated: number;
  conflicts: number;
  diagnostic: ZeroDiagnostic | null | undefined;
}): ZeroDiagnostic | null => {
  if (result.created + result.updated + result.conflicts > 0) {
    return null;
  }
  if (result.diagnostic == null) {
    return null;
  }
  if (result.diagnostic.blocks_matched > 0) {
    return null;
  }
  return result.diagnostic;
};

const errorFlashFor = (error: Error & {
  status?: number;
  retryAfterSeconds?: number;
}): RowFlash => {
  if (error.status === 429 && error.retryAfterSeconds != null) {
    return {
      kind: 'error',
      text: `Try again in ${error.retryAfterSeconds}s`,
    };
  }
  return { kind: 'error', text: "Couldn't update. Try again in a moment." };
};

const extractNotionId = (input: string): string => {
  const trimmed = input.trim();
  const urlMatch =
    /([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(
      trimmed
    );
  return urlMatch == null ? trimmed : urlMatch[1];
};

const normalizeId = (id: string): string => id.replaceAll('-', '').toLowerCase();

const renderSecondLine = (
  lastError: string | null | undefined,
  nextExportLabel: string | null
): ReactNode => {
  if (lastError != null) {
    return (
      <p className={styles.decksItemError}>
        Last check failed — we'll try again soon
      </p>
    );
  }
  if (nextExportLabel != null) {
    return (
      <p className={styles.decksItemError}>
        Next export at {nextExportLabel}
      </p>
    );
  }
  return null;
};

export default function NotionSubscriptions({ backend, schedule }: Props) {
  const api = backend ?? get2ankiApi();
  const queryClient = useQueryClient();
  const [advancedInput, setAdvancedInput] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'decks' | 'find' | null>(null);
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuContainerRef = useRef<HTMLUListElement | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(
    () => new Set()
  );
  const [flashByRow, setFlashByRow] = useState<Record<number, RowFlash>>({});
  const [zeroBannerByRow, setZeroBannerByRow] = useState<Record<number, ZeroDiagnostic | null>>({});
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

  const handleRefresh = useCallback(
    async (id: number) => {
      setOpenMenuId(null);
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setFlashByRow((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
      setZeroBannerByRow((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
      const previousTimer = flashTimers.current.get(id);
      if (previousTimer != null) {
        clearTimeout(previousTimer);
        flashTimers.current.delete(id);
      }
      try {
        const result = await api.refreshAnkifySubscription(id);
        showFlash(id, buildSuccessFlash({ ...result, diagnostic: result.diagnostic ?? null }));
        setZeroBannerByRow((prev) => ({
          ...prev,
          [id]: extractZeroDiagnostic(result),
        }));
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
        if (result.conflicts > 0) {
          queryClient.invalidateQueries({ queryKey: CONFLICTS_KEY });
        }
      } catch (error) {
        showFlash(id, errorFlashFor(error as Error));
      } finally {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [api, queryClient, showFlash]
  );

  const subs = useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: () => api.listAnkifySubscriptions(),
  });

  type SubscriptionRow = Awaited<
    ReturnType<typeof api.listAnkifySubscriptions>
  >[number];

  interface SubscribeArgs {
    notionPageId: string;
    notionPageTitle?: string | null;
    notionPageUrl?: string | null;
    notionPageIcon?: string | null;
  }

  const subscribe = useMutation({
    mutationFn: (args: SubscribeArgs) =>
      api.subscribeAnkifyNotionPage({
        notionPageId: args.notionPageId,
        notionPageTitle: args.notionPageTitle,
        notionPageUrl: args.notionPageUrl,
        notionPageIcon: args.notionPageIcon,
      }),
    onMutate: async (args: SubscribeArgs) => {
      await queryClient.cancelQueries({ queryKey: SUBSCRIPTIONS_KEY });
      const previous = queryClient.getQueryData<SubscriptionRow[]>(
        SUBSCRIPTIONS_KEY
      );
      const optimisticRow: SubscriptionRow = {
        id: -Date.now(),
        notion_page_id: args.notionPageId,
        notion_page_title: args.notionPageTitle ?? null,
        notion_page_url: args.notionPageUrl ?? null,
        notion_page_icon: args.notionPageIcon ?? null,
        enabled: true,
        last_polled_at: null,
        last_synced_at: null,
        last_error: null,
      };
      const alreadyPresent = (previous ?? []).some(
        (sub) =>
          normalizeId(sub.notion_page_id) ===
          normalizeId(args.notionPageId)
      );
      if (!alreadyPresent) {
        queryClient.setQueryData<SubscriptionRow[]>(SUBSCRIPTIONS_KEY, [
          ...(previous ?? []),
          optimisticRow,
        ]);
      }
      return { previous };
    },
    onError: (_err, _args, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(SUBSCRIPTIONS_KEY, context.previous);
      }
    },
    onSettled: () => {
      setPendingId(null);
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
    onSuccess: () => {
      setAdvancedInput('');
    },
  });

  const unsubscribe = useMutation({
    mutationFn: (id: number) => api.deleteAnkifySubscription(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY }),
  });

  const handlePick = (
    id: string,
    page?: { title?: string; url?: string; icon?: string }
  ) => {
    setPendingId(id);
    const trimmedIcon =
      page?.icon != null && page.icon.length > 0 ? page.icon : undefined;
    subscribe.mutate({
      notionPageId: id,
      notionPageTitle: page?.title ?? undefined,
      notionPageUrl: page?.url ?? undefined,
      notionPageIcon: trimmedIcon,
    });
  };

  const handleAdvancedSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (advancedInput.trim().length === 0) return;
    const id = extractNotionId(advancedInput);
    setPendingId(id);
    subscribe.mutate({ notionPageId: id });
  };

  const subscriptions = subs.data ?? [];
  const subscribedIds = new Set(
    subscriptions.map((sub) => normalizeId(sub.notion_page_id))
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

  const effectiveTab: 'decks' | 'find' =
    activeTab ?? (subscriptions.length === 0 ? 'find' : 'decks');
  const showSearch = subscriptions.length >= SEARCH_THRESHOLD;
  const filteredSubscriptions =
    search.trim().length === 0
      ? subscriptions
      : subscriptions.filter((sub) =>
          (sub.notion_page_title ?? '')
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        );

  return (
    <section>
      <div role="tablist" aria-label="Decks" className={styles.tabBar}>
        <button
          type="button"
          role="tab"
          id="ankify-tab-decks"
          aria-selected={effectiveTab === 'decks'}
          aria-controls="ankify-tabpanel-decks"
          className={
            effectiveTab === 'decks'
              ? `${styles.tab} ${styles.tabActive}`
              : styles.tab
          }
          onClick={() => setActiveTab('decks')}
        >
          Decks{' '}
          {subscriptions.length > 0 && (
            <span className={styles.tabCount}>{subscriptions.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          id="ankify-tab-find"
          aria-selected={effectiveTab === 'find'}
          aria-controls="ankify-tabpanel-find"
          className={
            effectiveTab === 'find'
              ? `${styles.tab} ${styles.tabActive}`
              : styles.tab
          }
          onClick={() => setActiveTab('find')}
        >
          Find pages
        </button>
      </div>

      {effectiveTab === 'find' && (
        <div
          role="tabpanel"
          id="ankify-tabpanel-find"
          aria-labelledby="ankify-tab-find"
          className={styles.tabPanel}
        >
          <NotionPagePicker
            backend={api}
            onSelect={handlePick}
            busyId={subscribe.isPending ? pendingId : null}
            disabledIds={subscribedIds}
            selectLabel="Make this a deck"
            busyLabel="Working…"
            subscribedLabel="Already a deck"
          />

          {subscribe.isError && (() => {
            const mapped = mapSubscribeError(subscribe.error as Error & { status?: number });
            return (
              <p role="alert" className={sharedStyles.helpDanger}>
                {mapped.text}
                {mapped.link != null && (
                  <>
                    {' '}
                    <Link to={mapped.link.href}>{mapped.link.label}</Link>
                  </>
                )}
              </p>
            );
          })()}
          {subscribe.isSuccess && (
            <>
              <p className={sharedStyles.helpSuccess}>
                Done. {subscribe.data.created} new flashcard
                {subscribe.data.created === 1 ? '' : 's'},{' '}
                {subscribe.data.updated} updated
                {subscribe.data.conflicts > 0
                  ? `, ${subscribe.data.conflicts} need a decision`
                  : ''}
                .
              </p>
              {subscribe.data.anki_web_sync === 'failed' && (
                <p className={sharedStyles.helpDanger}>
                  Couldn't reach AnkiWeb. Open Anki, sign in, then try again.
                </p>
              )}
            </>
          )}

          <details>
            <summary className={styles.advancedSummary}>
              Can't find it? Paste a Notion link instead.
            </summary>
            <form
              onSubmit={handleAdvancedSubmit}
              className={styles.advancedBody}
            >
              <label htmlFor="ankify-advanced-input">Notion page link</label>
              <div className={styles.advancedRow}>
                <input
                  id="ankify-advanced-input"
                  type="text"
                  value={advancedInput}
                  onChange={(event) => setAdvancedInput(event.target.value)}
                  placeholder="https://www.notion.so/..."
                />
                <button
                  type="submit"
                  className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
                  disabled={
                    subscribe.isPending || advancedInput.trim().length === 0
                  }
                >
                  Make this a deck
                </button>
              </div>
            </form>
          </details>
        </div>
      )}

      {effectiveTab === 'decks' && (
        subscriptions.length === 0 ? (
          <div
            role="tabpanel"
            id="ankify-tabpanel-decks"
            aria-labelledby="ankify-tab-decks"
            className={styles.tabPanel}
          >
            <p className={styles.emptyLine}>
              No decks yet. Switch to{' '}
              <button
                type="button"
                className={styles.inlineLinkButton}
                onClick={() => setActiveTab('find')}
              >
                Find pages
              </button>{' '}
              to add your first one.
            </p>
          </div>
        ) : (
        <div
          role="tabpanel"
          id="ankify-tabpanel-decks"
          aria-labelledby="ankify-tab-decks"
          className={styles.tabPanel}
        >
          {showSearch && (
            <div className={styles.searchAbove}>
              <input
                type="search"
                placeholder="Search your decks"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          )}
          <p className={styles.decksHelper}>
            Checks Notion for changes every 5 minutes.
          </p>
          <ul className={styles.decksList} ref={menuContainerRef}>
            {filteredSubscriptions.map((sub) => {
              const displayTitle =
                sub.notion_page_title?.trim().length
                  ? sub.notion_page_title
                  : 'Untitled page';
              const isSubscribingThisRow =
                subscribe.isPending &&
                pendingId != null &&
                normalizeId(pendingId) === normalizeId(sub.notion_page_id);
              const isRefreshingThisRow = refreshingIds.has(sub.id);
              const isUpdatingThisRow =
                isSubscribingThisRow || isRefreshingThisRow;
              const flash = flashByRow[sub.id] ?? null;
              const zeroBanner = zeroBannerByRow[sub.id] ?? null;
              const nextExportLabel =
                schedule?.enabled === true &&
                normalizeId(schedule.database_id) ===
                  normalizeId(sub.notion_page_id)
                  ? formatScheduleTime(schedule.time_of_day, schedule.timezone)
                  : null;
              const secondLine = renderSecondLine(
                sub.last_error,
                nextExportLabel
              );
              const relative = formatRelativeTime(sub.last_synced_at);
              const isPreparingFirstSync =
                sub.last_synced_at == null &&
                sub.last_polled_at == null &&
                sub.last_error == null;
              let lastSyncedDisplay: ReactNode;
              if (isPreparingFirstSync) {
                lastSyncedDisplay = (
                  <span className={styles.muted}>
                    Preparing your first sync — usually under a minute.
                  </span>
                );
              } else if (relative == null) {
                lastSyncedDisplay = (
                  <span className={styles.muted}>Not yet</span>
                );
              } else {
                lastSyncedDisplay = (
                  <span title={sub.last_synced_at ?? undefined}>
                    Last sync: {relative}
                  </span>
                );
              }
              const iconValue = sub.notion_page_icon ?? '';
              return (
                <Fragment key={sub.id}>
                <li className={styles.decksItem}>
                  {iconValue.length > 0 && (
                    <span className={styles.decksItemIcon} aria-hidden="true">
                      <BlockIcon icon={iconValue} />
                    </span>
                  )}
                  <span className={styles.decksItemTitle} title={displayTitle}>
                    {sub.notion_page_url != null &&
                    sub.notion_page_url.length > 0 ? (
                      <a
                        href={sub.notion_page_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {displayTitle}
                      </a>
                    ) : (
                      displayTitle
                    )}
                    {secondLine}
                  </span>
                  <span className={styles.decksItemTime} aria-live="polite">
                    {(() => {
                      if (isUpdatingThisRow) return <span>Updating now…</span>;
                      if (flash != null) {
                        return (
                          <span
                            className={
                              flash.kind === 'success'
                                ? styles.muted
                                : styles.decksItemError
                            }
                          >
                            {flash.text}
                          </span>
                        );
                      }
                      return lastSyncedDisplay;
                    })()}
                  </span>
                  <div className={styles.decksItemRowMenu}>
                    <button
                      type="button"
                      className={sharedStyles.btnIcon}
                      aria-label={`Options for ${displayTitle}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === sub.id}
                      onClick={() =>
                        setOpenMenuId((current) =>
                          current === sub.id ? null : sub.id
                        )
                      }
                    >
                      <DotsHorizontal width={16} height={16} />
                    </button>
                    {openMenuId === sub.id && (
                      <div role="menu" className={styles.decksItemMenu}>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.decksItemMenuItem}
                          aria-label={`Update ${displayTitle} now`}
                          onClick={() => handleRefresh(sub.id)}
                          disabled={isUpdatingThisRow}
                        >
                          Update now
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.decksItemMenuItem}
                          onClick={() => {
                            setOpenMenuId(null);
                            unsubscribe.mutate(sub.id);
                          }}
                          disabled={unsubscribe.isPending}
                        >
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                </li>
                {zeroBanner != null && (
                  <li className={styles.zeroBanner} aria-live="polite">
                    <p className={styles.zeroBannerText}>
                      {zeroBanner.blocks_scanned > 0 ? (
                        <>
                          We scanned <strong>{zeroBanner.blocks_scanned}</strong> blocks and didn't recognize any cards. Ankify looks for toggles, Q&A pairs, and bullets.{' '}
                        </>
                      ) : (
                        <>We couldn't read any content from this page.{' '}</>
                      )}
                      <a href="/documentation" className={styles.zeroBannerLink}>
                        What Ankify looks for →
                      </a>
                    </p>
                    {zeroBanner.unmatched_samples != null && zeroBanner.unmatched_samples.length > 0 && (
                      <details className={styles.zeroBannerDetails}>
                        <summary className={styles.zeroBannerSummary}>
                          What we saw on this page (first {zeroBanner.unmatched_samples.length})
                        </summary>
                        <ul className={styles.zeroBannerSamples}>
                          {zeroBanner.unmatched_samples.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                )}
                </Fragment>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
