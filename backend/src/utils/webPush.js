const webpush = require('web-push');

// In-memory store for push subscriptions: userId -> subscription object
// In a real production app you'd persist this to MongoDB
const pushSubscriptions = new Map();

const initWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:roomchat@example.com';

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys not set — push notifications disabled.');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log('[WebPush] ✅ VAPID configured — push notifications enabled.');
};

/**
 * Save a push subscription for a user (replaces old one)
 */
const saveSubscription = (userId, subscription) => {
  pushSubscriptions.set(userId.toLowerCase(), subscription);
};

/**
 * Remove push subscription for a user
 */
const removeSubscription = (userId) => {
  pushSubscriptions.delete(userId.toLowerCase());
};

/**
 * Send a push notification to a specific user (by userId)
 * Falls back silently if no subscription or keys not configured.
 */
const sendPushNotification = async (toUserId, payload) => {
  const subscription = pushSubscriptions.get(toUserId.toLowerCase());
  if (!subscription) return; // User hasn't subscribed

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log(`[WebPush] Sent push to ${toUserId}`);
  } catch (err) {
    console.warn(`[WebPush] Push failed for ${toUserId}:`, err.message);
    // If subscription is expired/invalid, remove it
    if (err.statusCode === 410 || err.statusCode === 404) {
      removeSubscription(toUserId);
    }
  }
};

/**
 * Get the VAPID public key (sent to frontend for subscription)
 */
const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

module.exports = {
  initWebPush,
  saveSubscription,
  removeSubscription,
  sendPushNotification,
  getVapidPublicKey,
};
