import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DownloadsPage, renderJobStatusCell } from './DownloadsPage';
import JobResponse from '../../schemas/public/JobResponse';
import { JobsId } from '../../schemas/public/Jobs';

vi.mock('./hooks/useJobs', () => ({
  default: () => ({
    jobs: mockJobs,
    deleteJob: vi.fn(),
    restartJob: vi.fn(),
    refreshJobs: vi.fn().mockResolvedValue(undefined),
    lastFetchedAt: new Date('2026-05-18T12:00:00Z'),
  }),
}));

vi.mock('./hooks/useUploads', () => ({
  default: () => ({
    uploads: mockUploads,
    loading: false,
    error: null,
    deleteUpload: vi.fn(),
    refreshUploads: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({}),
}));

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => ({
    data: { locals: { patreon: false, subscriber: false } },
  }),
}));

vi.mock('./hooks/useDropboxUploads', () => ({
  default: () => ({
    uploads: mockDropboxUploads,
    loading: false,
    error: false,
    deleteUpload: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
  }),
}));

vi.mock('./hooks/useGoogleDriveUploads', () => ({
  default: () => ({
    uploads: mockGoogleDriveUploads,
    loading: false,
    error: false,
    deleteUpload: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
  }),
}));

vi.mock('./hooks/useActiveShares', () => ({
  useActiveShares: () => [],
}));

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

let mockJobs: JobResponse[] = [];
let mockUploads: { id: string; size_mb: number; owner: number; key: string; filename: string; object_id: string; created_at: string | null }[] = [];
let mockDropboxUploads: { id: number; bytes: number; name: string; created_at: string | null }[] = [];
let mockGoogleDriveUploads: { id: string; iconUrl: string; mimeType: string; name: string; sizeBytes: string | null; url: string; last_converted_at: string | null }[] = [];

const buildJob = (overrides: Partial<JobResponse> = {}): JobResponse => ({
  id: 1 as JobsId,
  owner: 'owner-1',
  object_id: 'page-id',
  status: 'started',
  created_at: new Date('2026-05-10T11:30:00Z'),
  last_edited_time: new Date('2026-05-10T11:30:00Z'),
  title: 'Active conversion',
  type: 'page',
  job_reason_failure: null,
  restartable: false,
  download_key: null,
  upload_id: null,
  ...overrides,
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DownloadsPage setError={vi.fn()} />
    </MemoryRouter>
  );

describe('DownloadsPage paywall query param', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    mockJobs = [buildJob()];
    mockUploads = [];
    mockDropboxUploads = [];
    mockGoogleDriveUploads = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('shows PaywallBanner when ?paywall=1 is present', () => {
    renderAt('/downloads?paywall=1');
    expect(
      screen.getByText('One conversion at a time on the free plan')
    ).toBeInTheDocument();
  });

  it('does not show PaywallBanner without ?paywall=1', () => {
    renderAt('/downloads');
    expect(
      screen.queryByText('One conversion at a time on the free plan')
    ).not.toBeInTheDocument();
  });

  it('renders PaywallBanner without the in-progress affordance when no active job exists', () => {
    mockJobs = [];
    renderAt('/downloads?paywall=1');
    expect(
      screen.getByText('One conversion at a time on the free plan')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Or wait for/)).not.toBeInTheDocument();
  });
});

describe('DownloadsPage empty state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    mockJobs = [];
    mockUploads = [];
    mockDropboxUploads = [];
    mockGoogleDriveUploads = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('shows empty state when all four sources are empty', () => {
    renderAt('/downloads');
    expect(screen.getByText('No decks yet')).toBeInTheDocument();
  });

  it('hides empty state when doneJobs has entries', () => {
    mockJobs = [buildJob({ status: 'done' })];
    renderAt('/downloads');
    expect(screen.queryByText('No decks yet')).not.toBeInTheDocument();
  });

  it('hides empty state when uploads has entries', () => {
    mockUploads = [
      { id: 'u1', size_mb: 1, owner: 1, key: 'k1', filename: 'deck.apkg', object_id: 'o1', created_at: '2026-05-18T10:00:00Z' },
    ];
    renderAt('/downloads');
    expect(screen.queryByText('No decks yet')).not.toBeInTheDocument();
  });
});

describe('DownloadsPage chip filters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    mockUploads = [];
    mockDropboxUploads = [
      { id: 10, bytes: 1024, name: 'notes.html', created_at: '2026-05-17T08:00:00Z' },
    ];
    mockGoogleDriveUploads = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('chip filter ?filter=in-progress shows only active jobs', () => {
    mockJobs = [
      buildJob({ id: 1 as JobsId, status: 'started', title: 'Active job' }),
      buildJob({ id: 2 as JobsId, status: 'done', title: 'Done job' }),
    ];
    renderAt('/downloads?filter=in-progress');
    expect(screen.getByText('Active job')).toBeInTheDocument();
    expect(screen.queryByText('Done job')).not.toBeInTheDocument();
  });

  it('chip filter ?filter=dropbox shows only Dropbox rows', () => {
    mockJobs = [buildJob({ status: 'done', title: 'Notion deck' })];
    renderAt('/downloads?filter=dropbox');
    expect(screen.getByText('notes.html')).toBeInTheDocument();
    expect(screen.queryByText('Notion deck')).not.toBeInTheDocument();
  });

  it('shows "No decks match this filter." when filter has no results', () => {
    mockJobs = [];
    mockDropboxUploads = [];
    renderAt('/downloads?filter=dropbox');
    expect(screen.getByText('No decks match this filter.')).toBeInTheDocument();
  });
});

describe('DownloadsPage source labels', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    mockUploads = [];
    mockDropboxUploads = [];
    mockGoogleDriveUploads = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('shows "AI-generated from upload" label for claude jobs', () => {
    mockJobs = [buildJob({ type: 'claude', status: 'done', title: 'Claude deck' })];
    renderAt('/downloads');
    expect(screen.getByText('AI-generated from upload')).toBeInTheDocument();
  });

  it('shows "Notion" source label for notion jobs', () => {
    mockJobs = [buildJob({ type: 'page', status: 'done', title: 'Notion deck' })];
    renderAt('/downloads');
    expect(screen.getAllByText('Notion').length).toBeGreaterThan(0);
  });
});

describe('DownloadsPage preview button on done job rows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    mockUploads = [];
    mockDropboxUploads = [];
    mockGoogleDriveUploads = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('renders the preview link when a done job has a .apkg download_key', () => {
    mockJobs = [
      buildJob({
        status: 'done',
        type: 'page',
        title: 'Pharmacology Ch. 4',
        download_key: 'deck-abc123.apkg',
      }),
    ];
    renderAt('/downloads');
    const previewLink = screen.getByLabelText('Preview Pharmacology Ch. 4');
    expect(previewLink).toBeInTheDocument();
    expect(previewLink.getAttribute('href')).toBe('/preview/apkg/deck-abc123.apkg');
  });

  it('does not render the preview link when download_key does not end with .apkg', () => {
    mockJobs = [
      buildJob({
        status: 'done',
        type: 'page',
        title: 'Some deck',
        download_key: 'deck-abc123.zip',
      }),
    ];
    renderAt('/downloads');
    expect(screen.queryByLabelText('Preview Some deck')).not.toBeInTheDocument();
  });
});

describe('renderJobStatusCell — URL construction', () => {
  it('uses /api/download/u/<download_key> when download_key is present', () => {
    const job = buildJob({
      status: 'done',
      type: 'page',
      download_key: 'abc123.apkg',
      upload_id: 5,
    });
    const result = renderJobStatusCell(job);
    const { container } = render(<>{result}</>);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/api/download/u/abc123.apkg');
  });

  it('renders no Download action when download_key is null on a done job', () => {
    const job = buildJob({
      status: 'done',
      type: 'page',
      download_key: null,
      upload_id: null,
    });
    const result = renderJobStatusCell(job);
    expect(result).toBeNull();
  });

  it('renders in-progress indicator for non-terminal status', () => {
    const job = buildJob({ status: 'started', download_key: null, upload_id: null });
    const result = renderJobStatusCell(job);
    expect(result).not.toBeNull();
  });
});

describe('DownloadsPage deck feedback prompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    localStorage.clear();
    mockUploads = [];
    mockDropboxUploads = [];
    mockGoogleDriveUploads = [];
    mockJobs = [
      buildJob({
        status: 'done',
        type: 'page',
        title: 'Pharmacology Ch. 4',
        download_key: 'deck-abc123.apkg',
      }),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('hides the feedback prompt until a deck is downloaded', () => {
    renderAt('/downloads');
    expect(
      screen.queryByText('Did this deck come out right?')
    ).not.toBeInTheDocument();
  });

  it('shows the feedback prompt after clicking a download link', () => {
    renderAt('/downloads');
    fireEvent.click(screen.getByLabelText('Download Pharmacology Ch. 4'));
    expect(
      screen.getByText('Did this deck come out right?')
    ).toBeInTheDocument();
  });

  it('keeps the feedback prompt hidden after download when suppressed', () => {
    localStorage.setItem(
      '2anki_deck_feedback_suppressed_until',
      String(Date.now() + 60_000)
    );
    renderAt('/downloads');
    fireEvent.click(screen.getByLabelText('Download Pharmacology Ch. 4'));
    expect(
      screen.queryByText('Did this deck come out right?')
    ).not.toBeInTheDocument();
  });
});

describe('DownloadsPage failure reason panel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
    mockUploads = [];
    mockDropboxUploads = [];
    mockGoogleDriveUploads = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('expands failure reason panel when clicking failed status tag', () => {
    mockJobs = [
      buildJob({
        status: 'failed',
        title: 'Failed deck',
        job_reason_failure: 'Your page title has a "/" in it, which we can\'t save as a filename. Rename the page in Notion (try a dash or "and") and convert again.',
      }),
    ];
    renderAt('/downloads');

    const statusButton = screen.getByRole('button', { name: /Show failure reason/i });
    fireEvent.click(statusButton);

    expect(screen.getByText(/Your page title has a "\/" in it/)).toBeInTheDocument();
  });

  it('collapses panel when clicking chevron again', () => {
    mockJobs = [
      buildJob({
        status: 'failed',
        job_reason_failure: 'Your page title has a "/" in it, which we can\'t save as a filename. Rename the page in Notion (try a dash or "and") and convert again.',
      }),
    ];
    renderAt('/downloads');

    const statusButton = screen.getByRole('button', { name: /Show failure reason/i });
    fireEvent.click(statusButton);
    expect(screen.getByText(/Your page title has a "\/" in it/)).toBeInTheDocument();

    const collapseButton = screen.getByRole('button', { name: /Collapse failure reason/i });
    fireEvent.click(collapseButton);
    expect(screen.queryByText(/Your page title has a "\/" in it/)).not.toBeInTheDocument();
  });

  it('auto-expands most recent failed job if last_edited_time is within 10 minutes', () => {
    mockJobs = [
      buildJob({
        id: 1 as JobsId,
        status: 'failed',
        last_edited_time: new Date('2026-05-19T11:55:00Z'),
        job_reason_failure: 'Your page title has a "/" in it, which we can\'t save as a filename. Rename the page in Notion (try a dash or "and") and convert again.',
      }),
    ];
    renderAt('/downloads');

    expect(screen.getByText(/Your page title has a "\/" in it/)).toBeInTheDocument();
  });

  it('does not auto-expand if last_edited_time is older than 10 minutes', () => {
    mockJobs = [
      buildJob({
        status: 'failed',
        last_edited_time: new Date('2026-05-19T11:45:00Z'),
        job_reason_failure: 'Your page title has a "/" in it, which we can\'t save as a filename. Rename the page in Notion (try a dash or "and") and convert again.',
      }),
    ];
    renderAt('/downloads');

    expect(screen.queryByText(/Your page title has a "\/" in it/)).not.toBeInTheDocument();
  });

  it('shows Learn more link for empty deck errors', () => {
    mockJobs = [
      buildJob({
        status: 'failed',
        job_reason_failure: 'No cards in this deck yet. 2anki turns Notion toggle blocks into flashcards — the toggle title becomes the question, what\'s inside is the answer. Wrap your key terms in toggles in Notion, then convert again.',
      }),
    ];
    renderAt('/downloads');

    const statusButton = screen.getByRole('button', { name: /Show failure reason/i });
    fireEvent.click(statusButton);

    const learnMoreLink = screen.getByText(/Learn more/);
    expect(learnMoreLink).toBeInTheDocument();
    expect(learnMoreLink).toHaveAttribute('href', '/documentation/help/common-problems');
  });

  it('does not show Learn more link for non-empty-deck errors', () => {
    mockJobs = [
      buildJob({
        status: 'failed',
        job_reason_failure: 'Your page title has a "/" in it, which we can\'t save as a filename. Rename the page in Notion (try a dash or "and") and convert again.',
      }),
    ];
    renderAt('/downloads');

    const statusButton = screen.getByRole('button', { name: /Show failure reason/i });
    fireEvent.click(statusButton);

    expect(screen.queryByText(/Learn more/)).not.toBeInTheDocument();
  });
});
