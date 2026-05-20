import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoToFlashcardsPage } from './PhotoToFlashcardsPage';

const FAKE_DATA_URL = 'data:image/jpeg;base64,YWJjMTIz';

const mockUseUserLocals = vi.fn();
vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

function setLocals(opts: { paying: boolean }) {
  mockUseUserLocals.mockReturnValue({
    data: {
      locals: {
        email: 'test@example.com',
        patreon: opts.paying,
        subscriptions: [],
      },
    },
  });
}

function makePhoto(name = 'note.jpg', type = 'image/jpeg', sizeBytes = 1024): File {
  const blob = new Blob(['x'.repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

function mockFileReader() {
  class FakeFileReader {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL() {
      this.result = FAKE_DATA_URL;
      setTimeout(() => this.onload?.(), 0);
    }
  }
  vi.stubGlobal('FileReader', FakeFileReader);
}

function mockImageDimensions(width = 800, height = 600) {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = width;
    naturalHeight = height;
    set src(_v: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  }
  vi.stubGlobal('Image', FakeImage);
}

function mockObjectUrl() {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
}

describe('PhotoToFlashcardsPage', () => {
  beforeEach(() => {
    setLocals({ paying: false });
    mockFileReader();
    mockImageDimensions();
    mockObjectUrl();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the title and audience hint', () => {
    render(<PhotoToFlashcardsPage />);
    expect(screen.getByText('Snap a photo, get cards')).toBeTruthy();
    expect(screen.getByText(/textbook pages, lecture slides, and handwritten notes/)).toBeTruthy();
    expect(screen.getByText(/Ankify access required/)).toBeTruthy();
  });

  it('omits the access notice for paying users', () => {
    setLocals({ paying: true });
    render(<PhotoToFlashcardsPage />);
    expect(screen.queryByText(/Ankify access required/)).toBeNull();
  });

  it('rejects unsupported file types', () => {
    setLocals({ paying: true });
    render(<PhotoToFlashcardsPage />);
    const input = document.getElementById('photo-file-input') as HTMLInputElement;
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdf] } });
    expect(screen.getByText('Use JPEG, PNG, WebP, or GIF.')).toBeTruthy();
  });

  it('rejects photos over 10 MB', () => {
    setLocals({ paying: true });
    render(<PhotoToFlashcardsPage />);
    const input = document.getElementById('photo-file-input') as HTMLInputElement;
    const oversized = makePhoto('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(screen.getByText('Photo is over the 10 MB limit. Try a smaller image.')).toBeTruthy();
  });

  it('shows the specific 404 message when the route is disabled', async () => {
    setLocals({ paying: true });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<PhotoToFlashcardsPage />);
    const input = document.getElementById('photo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makePhoto()] } });
    fireEvent.click(screen.getByText('Get flashcards'));

    await waitFor(() => {
      expect(screen.getByText(/Photo to deck isn’t available yet/)).toBeTruthy();
    });
  });

  it('shows the access-required message on 403', async () => {
    setLocals({ paying: true });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<PhotoToFlashcardsPage />);
    const input = document.getElementById('photo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makePhoto()] } });
    fireEvent.click(screen.getByText('Get flashcards'));

    await waitFor(() => {
      expect(screen.getByText(/Ankify access is required for photo to deck/)).toBeTruthy();
    });
  });

  it('shows the too-large message on 413', async () => {
    setLocals({ paying: true });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 413 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<PhotoToFlashcardsPage />);
    const input = document.getElementById('photo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makePhoto()] } });
    fireEvent.click(screen.getByText('Get flashcards'));

    await waitFor(() => {
      expect(screen.getByText(/Photo is too large/)).toBeTruthy();
    });
  });

  it('shows the card-count success state when the deck arrives', async () => {
    setLocals({ paying: true });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('fake-apkg-bytes', {
        status: 200,
        headers: { 'X-Card-Count': '12', 'Content-Type': 'application/octet-stream' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy;

    render(<PhotoToFlashcardsPage />);
    const input = document.getElementById('photo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makePhoto('biology.jpg')] } });
    fireEvent.click(screen.getByText('Get flashcards'));

    await waitFor(() => {
      expect(screen.getByText(/12 cards from your photo\. Deck downloaded\./)).toBeTruthy();
    });
    expect(clickSpy).toHaveBeenCalled();
  });
});
