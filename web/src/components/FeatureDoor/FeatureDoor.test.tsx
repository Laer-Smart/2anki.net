import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordFeatureInterest = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ recordFeatureInterest }),
}));

import { FeatureDoor } from './FeatureDoor';

beforeEach(() => {
  recordFeatureInterest.mockReset();
  recordFeatureInterest.mockResolvedValue(undefined);
});

describe('FeatureDoor', () => {
  it('shows the feature title and interest prompt', () => {
    render(
      <FeatureDoor featureKey="study_reminders" title="Study reminders" />
    );
    expect(screen.getByText('Study reminders')).toBeInTheDocument();
    expect(screen.getByText('Would you use this?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "I'd use this" })
    ).toBeInTheDocument();
  });

  it('records interest with the feature key on click and shows the confirm', async () => {
    render(
      <FeatureDoor featureKey="study_reminders" title="Study reminders" />
    );
    fireEvent.click(screen.getByRole('button', { name: "I'd use this" }));
    await waitFor(() => {
      expect(recordFeatureInterest).toHaveBeenCalledWith('study_reminders');
    });
    expect(
      await screen.findByText("Noted — we'll tell you if we build it.")
    ).toBeInTheDocument();
  });

  it('posts the optional comment as a second interest record', async () => {
    render(<FeatureDoor featureKey="deck_folders" title="Deck folders" />);
    fireEvent.click(screen.getByRole('button', { name: "I'd use this" }));
    await screen.findByText("Noted — we'll tell you if we build it.");
    fireEvent.change(screen.getByLabelText('What would make it useful?'), {
      target: { value: 'nesting by course' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(recordFeatureInterest).toHaveBeenLastCalledWith(
        'deck_folders',
        'nesting by course'
      );
    });
    expect(
      await screen.findByText('Thanks — added to the note.')
    ).toBeInTheDocument();
  });

  it('skips the second record when the comment is left empty', async () => {
    render(
      <FeatureDoor featureKey="study_reminders" title="Study reminders" />
    );
    fireEvent.click(screen.getByRole('button', { name: "I'd use this" }));
    await screen.findByText("Noted — we'll tell you if we build it.");
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Thanks — added to the note.');
    expect(recordFeatureInterest).toHaveBeenCalledTimes(1);
  });

  it('lets the visitor dismiss the card without recording interest', () => {
    const { container } = render(
      <FeatureDoor featureKey="study_reminders" title="Study reminders" />
    );
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(container).toBeEmptyDOMElement();
    expect(recordFeatureInterest).not.toHaveBeenCalled();
  });

  it('offers a retry when recording fails', async () => {
    recordFeatureInterest.mockRejectedValueOnce(new Error('network'));
    render(
      <FeatureDoor featureKey="study_reminders" title="Study reminders" />
    );
    fireEvent.click(screen.getByRole('button', { name: "I'd use this" }));
    expect(await screen.findByText("Couldn't save that.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(recordFeatureInterest).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText("Noted — we'll tell you if we build it.")
    ).toBeInTheDocument();
  });
});
