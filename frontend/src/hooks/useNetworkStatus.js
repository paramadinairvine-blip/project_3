import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect online/offline status changes.
 * Returns { isOnline, showNotif, notifType }
 * - showNotif: whether to display the notification
 * - notifType: 'offline' | 'online'
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotif, setShowNotif] = useState(false);
  const [notifType, setNotifType] = useState(null); // 'offline' | 'online'
  const wasOfflineRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setNotifType('offline');
      setShowNotif(true);
      clearTimeout(timerRef.current);
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setNotifType('online');
        setShowNotif(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setShowNotif(false);
          wasOfflineRef.current = false;
        }, 3000);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearTimeout(timerRef.current);
    };
  }, []);

  return { isOnline, showNotif, notifType };
}
