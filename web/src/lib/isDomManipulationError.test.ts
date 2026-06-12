import { describe, expect, it } from 'vitest';

import { isDomManipulationError } from './isDomManipulationError';

describe('isDomManipulationError', () => {
  it('matches a NotFoundError DOMException', () => {
    const error = new DOMException(
      "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
      'NotFoundError'
    );

    expect(isDomManipulationError(error)).toBe(true);
  });

  it('matches a removeChild message even when the name differs', () => {
    const error = new Error(
      "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
    );

    expect(isDomManipulationError(error)).toBe(true);
  });

  it('does not match an ordinary render error', () => {
    expect(isDomManipulationError(new Error('boom'))).toBe(false);
  });

  it('does not match non-error values', () => {
    expect(isDomManipulationError(null)).toBe(false);
    expect(isDomManipulationError('insertBefore')).toBe(false);
    expect(isDomManipulationError(undefined)).toBe(false);
  });
});
