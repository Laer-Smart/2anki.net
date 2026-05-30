import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PostLoginSurvey from './PostLoginSurvey';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: vi.fn(),
}));

const mockGetStatus = vi.fn();
const mockSubmit = vi.fn();

const setApi = () => {
  vi.mocked(get2ankiApi).mockReturnValue({
    getPostLoginSurveyStatus: mockGetStatus,
    submitPostLoginSurvey: mockSubmit,
  } as unknown as ReturnType<typeof get2ankiApi>);
};

const advanceToShow = async () => {
  await act(async () => {
    vi.advanceTimersByTime(5000);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('PostLoginSurvey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mockGetStatus.mockReset();
    mockSubmit.mockReset();
    mockGetStatus.mockResolvedValue({ shouldShow: true });
    mockSubmit.mockResolvedValue(undefined);
    setApi();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('does not open or call the API when the session marker is absent', async () => {
    render(<PostLoginSurvey />);
    await advanceToShow();

    expect(mockGetStatus).not.toHaveBeenCalled();
    expect(screen.queryByText('Two quick questions')).toBeNull();
  });

  it('opens after 5 seconds when the marker is set and shouldShow is true', async () => {
    sessionStorage.setItem('2anki_post_login', '1');
    render(<PostLoginSurvey />);

    expect(screen.queryByText('Two quick questions')).toBeNull();
    await advanceToShow();

    expect(mockGetStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Two quick questions')).not.toBeNull();
  });

  it('stays hidden when shouldShow is false', async () => {
    sessionStorage.setItem('2anki_post_login', '1');
    mockGetStatus.mockResolvedValue({ shouldShow: false });
    render(<PostLoginSurvey />);
    await advanceToShow();

    expect(screen.queryByText('Two quick questions')).toBeNull();
  });

  it('consumes the marker on mount so a remount cannot re-arm', () => {
    sessionStorage.setItem('2anki_post_login', '1');
    render(<PostLoginSurvey />);

    expect(sessionStorage.getItem('2anki_post_login')).toBeNull();
  });

  it('submits answered with the improvement text and selected subject', async () => {
    sessionStorage.setItem('2anki_post_login', '1');
    render(<PostLoginSurvey />);
    await advanceToShow();

    fireEvent.click(screen.getByLabelText('Love it'));
    fireEvent.change(
      screen.getByPlaceholderText('What should we improve? (optional)'),
      { target: { value: 'Faster conversions' } }
    );
    fireEvent.click(screen.getByText('Medicine'));

    await act(async () => {
      fireEvent.click(screen.getByText('Send'));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSubmit).toHaveBeenCalledWith(
      'answered',
      'Faster conversions',
      'Medicine'
    );
    expect(
      screen.getByText('Thanks — this shapes what we build next.')
    ).not.toBeNull();
  });

  it('records a dismissal and closes when Not now is clicked', async () => {
    sessionStorage.setItem('2anki_post_login', '1');
    render(<PostLoginSurvey />);
    await advanceToShow();

    fireEvent.click(screen.getByText('Not now'));

    expect(mockSubmit).toHaveBeenCalledWith('dismissed');
    expect(screen.queryByText('Two quick questions')).toBeNull();
  });

  it('records a dismissal when the close button is clicked', async () => {
    sessionStorage.setItem('2anki_post_login', '1');
    render(<PostLoginSurvey />);
    await advanceToShow();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(mockSubmit).toHaveBeenCalledWith('dismissed');
    expect(screen.queryByText('Two quick questions')).toBeNull();
  });
});
