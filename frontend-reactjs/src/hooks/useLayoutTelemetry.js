import { useEffect, useRef } from 'react';

import { LAYOUT_TELEMETRY_EVENT } from '../config/layout.js';

export default function useLayoutTelemetry(name, { enabled = true } = {}) {
  const frameRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      return undefined;
    }

    const emit = () => {
      window.dispatchEvent(
        new CustomEvent(LAYOUT_TELEMETRY_EVENT, {
          detail: {
            layout: name,
            width: window.innerWidth,
            height: window.innerHeight,
            timestamp: Date.now()
          }
        })
      );
    };

    emit();

    const handleResize = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(emit);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, name]);
}
