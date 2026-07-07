import { isPaused, pausedResumesAt } from './isPaused';

describe('isPaused', () => {
  it('is false for a subscription with no pause_collection', () => {
    expect(isPaused({})).toBe(false);
    expect(isPaused({ pause_collection: null })).toBe(false);
  });

  it('is true when pause_collection has a behavior', () => {
    expect(
      isPaused({
        pause_collection: { behavior: 'void', resumes_at: 1893456000 },
      })
    ).toBe(true);
  });

  it('is false for a null subscription', () => {
    expect(isPaused(null)).toBe(false);
  });

  it('is false when pause_collection is present but has no behavior', () => {
    expect(isPaused({ pause_collection: { resumes_at: 1893456000 } })).toBe(
      false
    );
  });
});

describe('pausedResumesAt', () => {
  it('returns the resumes_at epoch when paused', () => {
    expect(
      pausedResumesAt({
        pause_collection: { behavior: 'void', resumes_at: 1893456000 },
      })
    ).toBe(1893456000);
  });

  it('returns null when not paused', () => {
    expect(pausedResumesAt({})).toBeNull();
  });

  it('returns null when paused without a resume date', () => {
    expect(
      pausedResumesAt({ pause_collection: { behavior: 'void' } })
    ).toBeNull();
  });
});
