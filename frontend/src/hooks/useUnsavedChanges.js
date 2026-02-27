import { useEffect } from 'react';

/**
 * Hook that warns the user when they try to leave a page with unsaved changes.
 * Uses browser beforeunload event (compatible with all React Router setups).
 *
 * @param {boolean} isDirty - Whether the form has unsaved changes
 * @param {string} [message] - Custom confirmation message
 */
export default function useUnsavedChanges(isDirty, message = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?') {
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
