import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import NotionSubscriptions from './NotionSubscriptions';
import { Backend } from '../../../lib/backend/Backend';

type Subscription = Awaited<ReturnType<Backend['listAnkifySubscriptions']>>[number];
type Schedule = Awaited<ReturnType<Backend['getAnkifyExportSchedule']>>;

const sampleSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 1,
  notion_page_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  notion_page_title: 'My deck',
  notion_page_url: 'https://notion.so/My-deck',
  notion_page_icon: null,
  enabled: true,
  last_polled_at: null,
  last_synced_at: new Date().toISOString(),
  last_error: null,
  ...overrides,
});

const sampleSchedule = (overrides: Partial<NonNullable<Schedule>> = {}): Schedule => ({
  id: 10,
  owner: 42,
  database_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  time_of_day: '09:15',
  timezone: 'UTC',
  date_range_days: null,
  enabled: true,
  last_run_at: null,
  ...overrides,
});

const makeBackend = (overrides: Partial<Backend> = {}): Backend =>
  ({
    listAnkifySubscriptions: vi.fn(async () => []),
    deleteAnkifySubscription: vi.fn(),
    subscribeAnkifyNotionPage: vi.fn(),
    searchTopLevelPages: vi.fn(async () => []),
    ...overrides,
  } as unknown as Backend);

const renderSubs = (
  backend: Backend,
  schedule: Schedule = null,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotionSubscriptions backend={backend} schedule={schedule} />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('NotionSubscriptions sync copy', () => {
  test('renders the page-level helper exactly once above the deck list', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 1, notion_page_id: 'a'.repeat(32) }),
        sampleSubscription({ id: 2, notion_page_id: 'b'.repeat(32) }),
        sampleSubscription({ id: 3, notion_page_id: 'c'.repeat(32) }),
      ]),
    });

    renderSubs(backend);

    await waitFor(() => {
      const matches = screen.getAllByText(/checks notion for changes every 5 minutes\./i);
      expect(matches).toHaveLength(1);
    });
  });

  test('does not render the helper when there are no decks', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => []),
    });

    renderSubs(backend);

    await waitFor(() =>
      expect(
        screen.getByLabelText(/search your notion pages/i)
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByText(/checks notion for changes every 5 minutes\./i)
    ).not.toBeInTheDocument();
  });

  test('renders no second line when last_error is null and no schedule matches', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: 'a'.repeat(32),
          last_error: null,
        }),
      ]),
    });

    renderSubs(backend);

    await waitFor(() =>
      expect(screen.getByText('My deck')).toBeInTheDocument()
    );
    expect(
      screen.queryByText(/last check failed/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/next export at/i)
    ).not.toBeInTheDocument();
  });

  test('renders the error line when last_error is set', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: 'a'.repeat(32),
          last_error: 'boom',
        }),
      ]),
    });

    renderSubs(backend);

    await waitFor(() =>
      expect(
        screen.getByText(/last check failed — we'll try again soon/i)
      ).toBeInTheDocument()
    );
  });

  test('renders next-export line when schedule matches and is enabled', async () => {
    const matchingId = 'a'.repeat(32);
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: matchingId,
          last_error: null,
        }),
      ]),
    });

    renderSubs(
      backend,
      sampleSchedule({ database_id: matchingId, time_of_day: '09:15', enabled: true })
    );

    await waitFor(() =>
      expect(screen.getByText(/^next export at /i)).toBeInTheDocument()
    );
  });

  test('does not render next-export line when schedule is disabled', async () => {
    const matchingId = 'a'.repeat(32);
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: matchingId,
          last_error: null,
        }),
      ]),
    });

    renderSubs(
      backend,
      sampleSchedule({ database_id: matchingId, enabled: false })
    );

    await waitFor(() =>
      expect(screen.getByText('My deck')).toBeInTheDocument()
    );
    expect(screen.queryByText(/next export at/i)).not.toBeInTheDocument();
  });

  test('does not render next-export line when schedule database_id does not match', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: 'a'.repeat(32),
          last_error: null,
        }),
      ]),
    });

    renderSubs(
      backend,
      sampleSchedule({ database_id: 'b'.repeat(32), enabled: true })
    );

    await waitFor(() =>
      expect(screen.getByText('My deck')).toBeInTheDocument()
    );
    expect(screen.queryByText(/next export at/i)).not.toBeInTheDocument();
  });

  test('renders the page icon next to the title when present', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: 'a'.repeat(32),
          notion_page_icon: '📘',
        }),
      ]),
    });

    renderSubs(backend);

    await waitFor(() =>
      expect(screen.getByText('My deck')).toBeInTheDocument()
    );
    expect(screen.getByText('📘')).toBeInTheDocument();
  });

  test('renders an image icon when notion_page_icon is a URL', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: 'a'.repeat(32),
          notion_page_icon: 'https://example.com/icon.png',
        }),
      ]),
    });

    renderSubs(backend);

    await waitFor(() =>
      expect(screen.getByText('My deck')).toBeInTheDocument()
    );
    const img = screen.getByAltText('icon') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/icon.png');
  });

  test('shows "Preparing your first sync" for a brand new subscription with no last_synced_at', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: 'a'.repeat(32),
          last_synced_at: null,
          last_polled_at: null,
          last_error: null,
        }),
      ]),
    });

    renderSubs(backend);

    await waitFor(() =>
      expect(
        screen.getByText(/preparing your first sync/i)
      ).toBeInTheDocument()
    );
  });

  test('kebab menu shows "Update now" with a per-deck aria-label, above "Stop"', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 11, notion_page_id: 'a'.repeat(32) }),
      ]),
    });

    renderSubs(backend);

    const kebab = await screen.findByRole('button', {
      name: /options for my deck/i,
    });
    fireEvent.click(kebab);

    const updateItem = await screen.findByRole('menuitem', {
      name: /update my deck now/i,
    });
    const stopItem = screen.getByRole('menuitem', { name: /^stop$/i });
    expect(updateItem).toBeInTheDocument();
    expect(stopItem).toBeInTheDocument();
    expect(updateItem.compareDocumentPosition(stopItem)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  test('clicking "Update now" calls refreshAnkifySubscription with the row id and shows a success flash', async () => {
    const refresh = vi.fn(async (_id: number) => ({
      created: 3,
      updated: 1,
      conflicts: 0,
      unchanged: 5,
      errors: [],
      anki_web_sync: 'synced' as const,
      anki_web_sync_error: null,
    }));
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 11, notion_page_id: 'a'.repeat(32) }),
      ]),
      refreshAnkifySubscription: refresh,
    });

    renderSubs(backend);

    const kebab = await screen.findByRole('button', {
      name: /options for my deck/i,
    });
    fireEvent.click(kebab);
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /update my deck now/i })
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledWith(11));
    expect(
      await screen.findByText(/updated · 3 new, 1 changed/i)
    ).toBeInTheDocument();
  });

  test('a refresh that returns no changes shows "Already up to date"', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 12, notion_page_id: 'b'.repeat(32) }),
      ]),
      refreshAnkifySubscription: vi.fn(async () => ({
        created: 0,
        updated: 0,
        conflicts: 0,
        unchanged: 9,
        errors: [],
        anki_web_sync: 'skipped' as const,
        anki_web_sync_error: null,
      })),
    });

    renderSubs(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for my deck/i })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /update my deck now/i })
    );

    expect(
      await screen.findByText(/already up to date/i)
    ).toBeInTheDocument();
  });

  test('a 429 cooldown error renders inline retry guidance', async () => {
    const cooldownError = Object.assign(new Error('cooldown'), {
      status: 429,
      retryAfterSeconds: 22,
    });
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 13, notion_page_id: 'c'.repeat(32) }),
      ]),
      refreshAnkifySubscription: vi.fn(async () => {
        throw cooldownError;
      }),
    });

    renderSubs(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for my deck/i })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /update my deck now/i })
    );

    expect(
      await screen.findByText(/try again in 22s/i)
    ).toBeInTheDocument();
  });

  test('a refresh that produced conflicts points the user at the banner above', async () => {
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 14, notion_page_id: 'd'.repeat(32) }),
      ]),
      refreshAnkifySubscription: vi.fn(async () => ({
        created: 0,
        updated: 0,
        conflicts: 2,
        unchanged: 1,
        errors: [],
        anki_web_sync: 'skipped' as const,
        anki_web_sync_error: null,
      })),
    });

    renderSubs(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for my deck/i })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /update my deck now/i })
    );

    expect(
      await screen.findByText(/needs a decision — see banner above/i)
    ).toBeInTheDocument();
  });

  test('the row shows "Updating now…" while the refresh is in flight', async () => {
    let resolveRefresh: (value: {
      created: number;
      updated: number;
      conflicts: number;
      unchanged: number;
      errors: string[];
      anki_web_sync: 'synced' | 'failed' | 'skipped';
      anki_web_sync_error: string | null;
    }) => void = () => undefined;
    const refresh = vi.fn(
      () =>
        new Promise<{
          created: number;
          updated: number;
          conflicts: number;
          unchanged: number;
          errors: string[];
          anki_web_sync: 'synced' | 'failed' | 'skipped';
          anki_web_sync_error: string | null;
        }>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({ id: 15, notion_page_id: 'e'.repeat(32) }),
      ]),
      refreshAnkifySubscription: refresh,
    });

    renderSubs(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for my deck/i })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /update my deck now/i })
    );

    expect(await screen.findByText(/updating now…/i)).toBeInTheDocument();

    await act(async () => {
      resolveRefresh({
        created: 1,
        updated: 0,
        conflicts: 0,
        unchanged: 0,
        errors: [],
        anki_web_sync: 'synced',
        anki_web_sync_error: null,
      });
    });

    await waitFor(() =>
      expect(screen.queryByText(/updating now…/i)).not.toBeInTheDocument()
    );
  });

  test('error line takes precedence over next-export line', async () => {
    const matchingId = 'a'.repeat(32);
    const backend = makeBackend({
      listAnkifySubscriptions: vi.fn(async () => [
        sampleSubscription({
          id: 1,
          notion_page_id: matchingId,
          last_error: 'boom',
        }),
      ]),
    });

    renderSubs(
      backend,
      sampleSchedule({ database_id: matchingId, enabled: true })
    );

    await waitFor(() =>
      expect(
        screen.getByText(/last check failed — we'll try again soon/i)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/next export at/i)).not.toBeInTheDocument();
  });
});

describe('NotionSubscriptions subscribe error mapping', () => {
  const makeSubscribeError = (message: string, status?: number) =>
    Object.assign(new Error(message), { status });

  it.each([
    [401, 'Unauthorized', "Auto Sync isn't active on this account.", 'Manage subscription'],
    [403, 'Forbidden', "Auto Sync isn't active on this account.", 'Manage subscription'],
  ])('status %d → paywall copy with manage link', async (status, message, expectedText, expectedLink) => {
    const backend = makeBackend({
      subscribeAnkifyNotionPage: vi.fn(async () => {
        throw makeSubscribeError(message, status);
      }),
    });
    renderSubs(backend);

    const input = await screen.findByPlaceholderText(/https:\/\/www\.notion\.so/i);
    fireEvent.change(input, { target: { value: 'https://www.notion.so/test-' + 'a'.repeat(32) } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText(expectedText)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: expectedLink })).toBeInTheDocument();
  });

  it('409 NotionNotConnected → Notion connect copy with link', async () => {
    const backend = makeBackend({
      subscribeAnkifyNotionPage: vi.fn(async () => {
        throw makeSubscribeError('Notion is not connected', 409);
      }),
    });
    renderSubs(backend);

    const input = await screen.findByPlaceholderText(/https:\/\/www\.notion\.so/i);
    fireEvent.change(input, { target: { value: 'https://www.notion.so/test-' + 'a'.repeat(32) } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText("Notion isn't connected to 2anki.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connect Notion' })).toBeInTheDocument();
  });

  it('409 NoActiveAnkifyClient → set up Anki copy with link', async () => {
    const backend = makeBackend({
      subscribeAnkifyNotionPage: vi.fn(async () => {
        throw makeSubscribeError('No active Ankify client. Provision one before subscribing.', 409);
      }),
    });
    renderSubs(backend);

    const input = await screen.findByPlaceholderText(/https:\/\/www\.notion\.so/i);
    fireEvent.change(input, { target: { value: 'https://www.notion.so/test-' + 'a'.repeat(32) } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText("Your hosted Anki isn't set up yet.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up Anki' })).toBeInTheDocument();
  });

  it('503 → AnkiConnect unreachable copy (no link)', async () => {
    const backend = makeBackend({
      subscribeAnkifyNotionPage: vi.fn(async () => {
        throw makeSubscribeError('AnkiConnect is unreachable.', 503);
      }),
    });
    renderSubs(backend);

    const input = await screen.findByPlaceholderText(/https:\/\/www\.notion\.so/i);
    fireEvent.change(input, { target: { value: 'https://www.notion.so/test-' + 'a'.repeat(32) } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText("Anki isn't responding right now. Try again in a moment.")).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('unknown error → fallback copy (no link)', async () => {
    const backend = makeBackend({
      subscribeAnkifyNotionPage: vi.fn(async () => {
        throw makeSubscribeError('network failure');
      }),
    });
    renderSubs(backend);

    const input = await screen.findByPlaceholderText(/https:\/\/www\.notion\.so/i);
    fireEvent.change(input, { target: { value: 'https://www.notion.so/test-' + 'a'.repeat(32) } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('Something broke on our end. Try again, or email support@2anki.net.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
