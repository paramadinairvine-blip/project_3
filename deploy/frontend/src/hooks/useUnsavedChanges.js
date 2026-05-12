import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook that warns the user when they try to leave a page with unsaved changes.
 * Uses React Router v6.4+ useBlocker + browser beforeunload event.
 *
 * @param {boolean} isDirty - Whether the form has unsaved changes
 * @param {string} [message] - Custom confirmation message
 */
export default function useUnsavedChanges(isDirty, message = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?') {
  // Block navigation within the SPA
  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }) => {
      return isDirty && currentLocation.pathname !== nextLocation.pathname;
    }, [isDirty])
  );

  // Show confirm dialog when blocker is triggered
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);

  // Block browser close/refresh
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, message]);
}
