import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import { useInViewOnce } from './useInViewOnce';

function Probe({ onInView }: Readonly<{ onInView: () => void }>) {
  const ref = useInViewOnce<HTMLDivElement>(onInView);
  return <div ref={ref}>probe</div>;
}

describe('useInViewOnce', () => {
  it('calls onInView once when the element intersects', () => {
    const onInView = vi.fn();
    const { rerender } = render(<Probe onInView={onInView} />);
    rerender(<Probe onInView={onInView} />);
    expect(onInView).toHaveBeenCalledTimes(1);
  });
});
