import { useLayoutEffect, useRef } from 'react';

export default function AnimatedChartLine({ d, className, stroke, duration = 720, layoutVersion = 0 }) {
  const pathRef = useRef(null);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path || !d) return undefined;

    const totalLength = path.getTotalLength();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof path.animate !== 'function') {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      return undefined;
    }

    path.style.strokeDasharray = `${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;
    const animation = path.animate([
      { strokeDashoffset: `${totalLength}` },
      { strokeDashoffset: '0' },
    ], {
      duration,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
    });

    animation.onfinish = () => {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
    };

    return () => animation.cancel();
  }, [d, duration, layoutVersion]);

  return <path
    ref={pathRef}
    d={d}
    className={className}
    style={{ stroke }}
    vectorEffect="non-scaling-stroke"
  />;
}
