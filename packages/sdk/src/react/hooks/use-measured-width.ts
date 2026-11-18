import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The width of an element, kept up to date by a `ResizeObserver`. It is measured before the first
 * paint, so a narrow container never flashes the wide layout. A width of zero means the element is
 * hidden or not laid out, and the last real width is kept.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const measured = element.getBoundingClientRect().width;
      if (measured > 0) setWidth(measured);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
