import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LeechesPanel from './LeechesPanel';
import { Backend, LeechNote } from '../../../lib/backend/Backend';

const trackMock = vi.fn();
vi.mock('../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

const renderPanel = (backend: Backend) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeechesPanel backend={backend} />
    </QueryClientProvider>
  );
};

const basicLeech = (overrides: Partial<LeechNote> = {}): LeechNote => ({
  noteId: 101,
  deckName: 'Notion Sync::Pharmacology',
  modelName: 'Basic',
  fields: [
    { name: 'Front', value: '<b>What is the half-life?</b>' },
    { name: 'Back', value: 'About 6 hours' },
  ],
  tags: ['leech'],
  lapses: 9,
  suspended: true,
  ...overrides,
});

const makeBackend = (overrides: Partial<Backend> = {}): Backend =>
  ({
    listAnkifyLeeches: vi.fn(async () => ({
      connected: true as const,
      leeches: [basicLeech()],
    })),
    editAnkifyLeech: vi.fn(async () => {}),
    deleteAnkifyLeech: vi.fn(async () => {}),
    returnAnkifyLeechToReview: vi.fn(async () => {}),
    openAnkifyDeckInAnki: vi.fn(async () => ({ opened: true })),
    ...overrides,
  }) as unknown as Backend;

beforeEach(() => {
  trackMock.mockClear();
});

describe('LeechesPanel', () => {
  test('renders a leech row with HTML-stripped front, deck path, and lapse count', async () => {
    renderPanel(makeBackend());

    expect(
      await screen.findByText(/what is the half-life\?/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/<b>/)).not.toBeInTheDocument();
    expect(screen.getByText('Notion Sync::Pharmacology')).toBeInTheDocument();
    expect(screen.getByText('⌗9')).toBeInTheDocument();
  });

  test('empty list shows the calm empty state', async () => {
    const backend = makeBackend({
      listAnkifyLeeches: vi.fn(async () => ({
        connected: true as const,
        leeches: [],
      })),
    });

    renderPanel(backend);

    expect(
      await screen.findByText(/no leeches — every card is sticking/i)
    ).toBeInTheDocument();
  });

  test('offline degrades calmly without crashing', async () => {
    const backend = makeBackend({
      listAnkifyLeeches: vi.fn(async () => ({ connected: false as const })),
    });

    renderPanel(backend);

    expect(
      await screen.findByText(/leeches load once anki is running/i)
    ).toBeInTheDocument();
  });

  test('editing fires the leech_action event and calls the edit endpoint', async () => {
    const editAnkifyLeech = vi.fn(async () => {});
    const backend = makeBackend({ editAnkifyLeech });

    renderPanel(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for/i })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /edit card/i }));

    const front = await screen.findByLabelText('Front');
    fireEvent.change(front, { target: { value: 'New front' } });
    fireEvent.click(screen.getByRole('button', { name: /save card/i }));

    await waitFor(() =>
      expect(editAnkifyLeech).toHaveBeenCalledWith(101, {
        Front: 'New front',
        Back: 'About 6 hours',
      })
    );
    expect(trackMock).toHaveBeenCalledWith('ankify_leech_action', {
      action: 'edit',
    });
  });

  test('delete needs a two-step inline confirm before calling the endpoint', async () => {
    const deleteAnkifyLeech = vi.fn(async () => {});
    const backend = makeBackend({ deleteAnkifyLeech });

    renderPanel(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for/i })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /delete card/i }));

    expect(deleteAnkifyLeech).not.toHaveBeenCalled();
    expect(screen.getByText(/delete this card\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(deleteAnkifyLeech).toHaveBeenCalledWith(101));
    expect(trackMock).toHaveBeenCalledWith('ankify_leech_action', {
      action: 'delete',
    });
  });

  test('a multi-field note routes Edit to the Open-in-Anki fallback', async () => {
    const openAnkifyDeckInAnki = vi.fn(async () => ({ opened: true }));
    const backend = makeBackend({
      listAnkifyLeeches: vi.fn(async () => ({
        connected: true as const,
        leeches: [
          basicLeech({
            modelName: 'Cloze',
            fields: [
              { name: 'Text', value: 'Some {{c1::cloze}}' },
              { name: 'Extra', value: 'note' },
              { name: 'Hint', value: 'h' },
            ],
          }),
        ],
      })),
      openAnkifyDeckInAnki,
    });

    renderPanel(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for/i })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /edit card/i }));

    await waitFor(() =>
      expect(openAnkifyDeckInAnki).toHaveBeenCalledWith(
        'Notion Sync::Pharmacology'
      )
    );
  });

  test('a failed delete degrades calmly to a retry message', async () => {
    const deleteAnkifyLeech = vi.fn(async () => {
      const error = new Error('Card not found for this user') as Error & {
        status?: number;
      };
      error.status = 403;
      throw error;
    });
    const backend = makeBackend({ deleteAnkifyLeech });

    renderPanel(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /options for/i })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /delete card/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(
      await screen.findByText(/couldn't delete\. try again in a moment/i)
    ).toBeInTheDocument();
  });
});
