"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function TelemetryTracker() {
  const pathname = usePathname();
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastLoggedRef.current === pathname) return;
    lastLoggedRef.current = pathname;

    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pathname,
          referrer: typeof document !== 'undefined' ? document.referrer : '',
        }),
      }).catch(() => {
        // Silent fail for non-blocking telemetry
      });
    } catch {
      // Ignore
    }
  }, [pathname]);

  return null;
}
