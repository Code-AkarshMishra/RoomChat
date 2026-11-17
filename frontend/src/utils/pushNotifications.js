/**
 * RoomChat Web Push Notification Utility
 * Handles service worker registration and push subscription management.
 */

const PUSH_KEY_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/push-key`;
const PUSH_SUBSCRIBE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/push-subscribe`;
const PUSH_UNSUBSCRIBE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/push-unsubscribe`;

/**
 * Convert a URL-safe base64 VAPID public key to a Uint8Array
 * Required for PushManager.subscribe()
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

/**
 * Register the service worker. Call once on app load.
 * Returns the ServiceWorkerRegistration or null if not supported.
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service workers not supported in this browser.');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] ✅ Service Worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('[Push] Service Worker registration failed:', err);
    return null;
  }
};

/**
 * Subscribe this user to web push notifications.
 * - Requests notification permission if not already granted
 * - Gets VAPID public key from backend
 * - Creates PushManager subscription
 * - Sends subscription to backend for storage
 * Returns true if successful, false otherwise.
 */
export const subscribeToPush = async (authToken) => {
  try {
    // 1. Check/request notification permission
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'denied') return false;

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    // 2. Get service worker registration
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;

    // 3. Fetch VAPID public key from backend
    const keyRes = await fetch(PUSH_KEY_URL, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    // 4. Check if already subscribed to this key
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      // Already subscribed — just re-send to backend in case server restarted
      await sendSubscriptionToServer(existingSub, authToken);
      return true;
    }

    // 5. Create new push subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // 6. Send subscription to backend
    await sendSubscriptionToServer(subscription, authToken);
    console.log('[Push] ✅ Push subscription active');
    return true;
  } catch (err) {
    console.warn('[Push] Subscribe failed:', err);
    return false;
  }
};

/**
 * Unsubscribe from web push notifications.
 */
export const unsubscribeFromPush = async (authToken) => {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    // Also notify backend
    await fetch(PUSH_UNSUBSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => {});

    console.log('[Push] Unsubscribed from push notifications');
  } catch (err) {
    console.warn('[Push] Unsubscribe failed:', err);
  }
};

/**
 * Send push subscription object to backend for storage.
 */
const sendSubscriptionToServer = async (subscription, authToken) => {
  const res = await fetch(PUSH_SUBSCRIBE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  return res.ok;
};
