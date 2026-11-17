// Strict Zero-Storage In-Memory Token Manager
// Absolutely NO localStorage, sessionStorage, or credential cookies
let _inMemoryToken = null;

export const setAuthToken = (token) => {
  _inMemoryToken = token;
};

export const getAuthToken = () => {
  return _inMemoryToken;
};

export const clearAuthToken = () => {
  _inMemoryToken = null;
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

// 1. Step 1: User ID and Password
export const apiLoginStep1 = async (userId, password) => {
  return request('/api/auth/login-step1', {
    method: 'POST',
    body: JSON.stringify({ userId, password }),
  });
};

// 2. Step 2: 4-digit Secret PIN Gate
export const apiLoginStep2 = async (partialToken, pin) => {
  return request('/api/auth/login-step2', {
    method: 'POST',
    body: JSON.stringify({ partialToken, pin }),
  });
};

// 3. User Profile
export const apiGetProfile = async () => {
  return request('/api/auth/profile');
};

// 4. Fetch Messages
export const apiGetMessages = async (limit = 60) => {
  return request(`/api/chat/messages?limit=${limit}`);
};

// 5. Upload Media File (Camera, Gallery, Audio)
export const apiUploadMedia = async (file, type) => {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('type', type);

  const token = getAuthToken();
  const res = await fetch(`${BASE_URL}/api/chat/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Media upload failed.');
  }
  return data;
};

// 6. Burn Note action (view, destruct)
export const apiBurnNoteAction = async (messageId, action) => {
  return request('/api/chat/burn-note', {
    method: 'POST',
    body: JSON.stringify({ messageId, action }),
  });
};

// 7. Update Vibe
export const apiUpdateVibe = async (emoji, text) => {
  return request('/api/chat/vibe', {
    method: 'POST',
    body: JSON.stringify({ emoji, text }),
  });
};

// 8. Couple Metadata (Countdown, Notes)
export const apiGetCoupleMeta = async () => {
  return request('/api/chat/couple-meta');
};

export const apiUpdateCoupleMeta = async (metaData) => {
  return request('/api/chat/couple-meta', {
    method: 'PUT',
    body: JSON.stringify(metaData),
  });
};

