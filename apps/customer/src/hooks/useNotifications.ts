import { useEffect, useRef } from 'react';
import { updateProfile, getToken } from '../services/api';

/**
 * Requests browser Notification permission on mount and registers
 * a pseudo-token in push_tokens so the backend knows this browser opted in.
 *
 * Full Web Push (VAPID + service worker) can be layered in once VAPID keys
 * are provisioned — this hook establishes the registration path.
 */
export function useNotifications(userId: string | null) {
  const registered = useRef(false);

  useEffect(() => {
    if (!userId || registered.current) return;
    if (typeof Notification === 'undefined') return;

    const request = async () => {
      const permission = await Notification.requestPermission().catch(() => 'denied');
      if (permission !== 'granted') return;

      // Register a stable browser-identity token.
      // Format: web:<userId>:<short-ua> — unique per user+browser combination.
      const token = `web:${userId}:${navigator.userAgent.slice(0, 40).replace(/\s/g, '_')}`;
      if (!getToken()) return;

      await updateProfile({ push_token: token }).catch(() => null);
      registered.current = true;
    };

    request();
  }, [userId]);
}
