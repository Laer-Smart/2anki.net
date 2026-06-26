import { useEffect, useRef } from 'react';

export function useInViewOnce<T extends Element>(onInView: () => void) {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(onInView);
  callbackRef.current = onInView;

  useEffect(() => {
    const element = ref.current;
    if (element == null) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let fired = false;
    const observer = new IntersectionObserver((entries) => {
      if (fired) return;
      if (entries.some((entry) => entry.isIntersecting)) {
        fired = true;
        callbackRef.current();
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}
