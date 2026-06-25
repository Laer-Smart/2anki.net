import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProducerPrompt } from './ProducerPrompt';
import UserUpload from '../../../lib/interfaces/UserUpload';

const mockGetPitchEligibility = vi.fn();
const mockDismissPitch = vi.fn();

vi.mock('../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    getPitchEligibility: mockGetPitchEligibility,
    dismissPitch: mockDismissPitch,
  }),
}));

vi.mock('../../../lib/analytics/track', () => ({ track: vi.fn() }));

function makeUploads(count: number): UserUpload[] {
  const created = new Date().toISOString();
  return Array.from({ length: count }, (_, i) => ({
    id: `u${i}`,
    size_mb: 1,
    owner: 1,
    key: `k${i}`,
    filename: `f${i}.apkg`,
    object_id: `o${i}`,
    created_at: created,
    source: 'upload',
  }));
}

beforeEach(() => {
  mockGetPitchEligibility.mockReset();
  mockDismissPitch.mockReset();
  mockGetPitchEligibility.mockResolvedValue({
    convertSuccess: false,
    accountBanner: false,
    producerPrompt: true,
  });
  mockDismissPitch.mockResolvedValue(undefined);
});

describe('ProducerPrompt', () => {
  it('shows the card for a heavy uploader who has not dismissed it', async () => {
    render(<ProducerPrompt uploads={makeUploads(21)} />);
    expect(
      await screen.findByText('Making decks for other people?')
    ).toBeInTheDocument();
  });

  it('renders nothing for a user below the upload threshold', () => {
    render(<ProducerPrompt uploads={makeUploads(20)} />);
    expect(mockGetPitchEligibility).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Making decks for other people?')
    ).not.toBeInTheDocument();
  });

  it('renders nothing when the prompt was already dismissed server-side', async () => {
    mockGetPitchEligibility.mockResolvedValue({
      convertSuccess: false,
      accountBanner: false,
      producerPrompt: false,
    });
    render(<ProducerPrompt uploads={makeUploads(21)} />);
    await waitFor(() => expect(mockGetPitchEligibility).toHaveBeenCalled());
    expect(
      screen.queryByText('Making decks for other people?')
    ).not.toBeInTheDocument();
  });

  it('persists the dismissal and hides the card on Not now', async () => {
    render(<ProducerPrompt uploads={makeUploads(21)} />);
    fireEvent.click(await screen.findByText('Not now'));
    await waitFor(() =>
      expect(mockDismissPitch).toHaveBeenCalledWith('producer_prompt')
    );
    expect(
      screen.queryByText('Making decks for other people?')
    ).not.toBeInTheDocument();
  });
});
