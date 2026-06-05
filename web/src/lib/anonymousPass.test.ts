import {
  getStoredPassToken,
  storePassToken,
  clearPassToken,
} from './anonymousPass';

describe('anonymousPass', () => {
  const mockStorage: Record<string, string> = {};
  const localStorageMock = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    clearPassToken();
  });

  it('returns null when no token is stored', () => {
    expect(getStoredPassToken()).toBeNull();
  });

  it('stores and retrieves a pass token', () => {
    storePassToken('cs_test_123');
    expect(getStoredPassToken()).toBe('cs_test_123');
  });

  it('clears a stored token', () => {
    storePassToken('cs_test_456');
    clearPassToken();
    expect(getStoredPassToken()).toBeNull();
  });
});
