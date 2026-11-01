import { useCallback, useEffect, useRef, useState } from 'react';

export default function useChartSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    setSize(previous => (
      previous.width === width && previous.height === height
        ? previous
        : { width, height }
    ));
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const frameId = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener('resize', measure);
      };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { ref, ...size, measure };
}
