import { useCallback, useEffect, useRef, useState } from 'react';

const HINT_STORAGE_KEY = 'labware-monthly-chart-scroll-hint-dismissed';

function readHintPreference() {
  try {
    return window.sessionStorage.getItem(HINT_STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
}

export default function useHorizontalScroll({ activeIndex, selectedMonth, year, enabled }) {
  const ref = useRef(null);
  const [scrollState, setScrollState] = useState({
    scrollLeft: 0,
    clientWidth: 0,
    hasOverflow: false,
    hasLeftOverflow: false,
    hasRightOverflow: false,
  });
  const [showHint, setShowHint] = useState(readHintPreference);

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    const hasOverflow = scrollWidth > clientWidth + 1;
    setScrollState({
      scrollLeft,
      clientWidth,
      hasOverflow,
      hasLeftOverflow: hasOverflow && scrollLeft > 1,
      hasRightOverflow: hasOverflow && scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  const scrollToMonth = useCallback(index => {
    const element = ref.current;
    if (!element || !Number.isInteger(index) || index < 0) return;
    const monthWidth = element.scrollWidth / 12;
    const target = Math.max(0, Math.min(
      element.scrollWidth - element.clientWidth,
      (index + 0.5) * monthWidth - element.clientWidth / 2,
    ));
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      element.scrollLeft = target;
    } else {
      element.scrollTo({ left: target, behavior: 'smooth' });
    }
  }, []);
  const attachRef = useCallback(node => {
    ref.current = node;
    if (node) {
      window.requestAnimationFrame(() => {
        measure();
        scrollToMonth(activeIndex);
      });
    }
  }, [activeIndex, measure, scrollToMonth]);

  const dismissHint = useCallback(() => {
    if (!showHint) return;
    setShowHint(false);
    try {
      window.sessionStorage.setItem(HINT_STORAGE_KEY, 'true');
    } catch {
      // The hint still dismisses for this render if storage is unavailable.
    }
  }, [showHint]);

  useEffect(() => {
    if (!enabled) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    const update = () => {
      measure();
      scrollToMonth(activeIndex);
    };
    const frameId = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [activeIndex, enabled, measure, scrollToMonth, selectedMonth, year]);

  return {
    ref: attachRef,
    ...scrollState,
    showHint: showHint && scrollState.hasOverflow,
    measure,
    dismissHint,
    scrollToMonth,
  };
}
