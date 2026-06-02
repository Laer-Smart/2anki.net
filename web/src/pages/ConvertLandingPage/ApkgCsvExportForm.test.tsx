import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ApkgCsvExportForm from './ApkgCsvExportForm';

const mockTrack = vi.fn();

vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

function makeApkgFile(name = 'deck.apkg'): File {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], name, {
    type: 'application/octet-stream',
  });
}

describe('ApkgCsvExportForm', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  });

  afterEach(() => {
    mockTrack.mockClear();
    vi.restoreAllMocks();
  });

  it('disables submit until the user picks a file', () => {
    render(<ApkgCsvExportForm />);
    const button = screen.getByRole('button', { name: /Export to CSV/i });
    expect(button).toBeDisabled();
  });

  it('rejects a non-.apkg file with an inline error and never calls fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    );
    render(<ApkgCsvExportForm />);
    const input = screen.getByLabelText(/Choose \.apkg file/i) as HTMLInputElement;
    const file = new File(['x'], 'notes.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/isn’t an \.apkg/i);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts the file to /api/apkg/csv and shows the note count on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Model,Front,Back,Tags\r\nBasic,Q,A,\r\n', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition':
            "attachment; filename=\"deck.csv\"; filename*=UTF-8''deck.csv",
          'X-Card-Count': '42',
        },
      })
    );
    render(<ApkgCsvExportForm />);
    const input = screen.getByLabelText(/Choose \.apkg file/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeApkgFile('Pharmacology.apkg')] } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(screen.getByText(/Exported 42 notes/i)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/apkg/csv');
    expect((init as RequestInit).method).toBe('post');
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(mockTrack).toHaveBeenCalledWith('apkg_csv_exported', { noteCount: 42 });
  });

  it('does not track an export when the server returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    render(<ApkgCsvExportForm />);
    const input = screen.getByLabelText(/Choose \.apkg file/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeApkgFile()] } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('surfaces the server error message on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: '250 notes — over the free limit of 100. Upgrade for no monthly cap.',
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    );
    render(<ApkgCsvExportForm />);
    const input = screen.getByLabelText(/Choose \.apkg file/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeApkgFile()] } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/over the free limit of 100/i);
    });
  });

  it('falls back to a sign-in prompt when the server returns 401 with no body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    );
    render(<ApkgCsvExportForm />);
    const input = screen.getByLabelText(/Choose \.apkg file/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeApkgFile()] } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Sign in/i);
    });
  });
});
