'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const set = () => setIsMobile(mql.matches);
    set();
    if (mql.addEventListener) mql.addEventListener('change', set);
    else mql.addListener(set);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', set);
      else mql.removeListener(set);
    };
  }, [breakpointPx]);

  return isMobile;
}
