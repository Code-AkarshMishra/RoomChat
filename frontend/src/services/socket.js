import { io } from 'socket.io-client';
import { getAuthToken } from './api';

let socket = null;
let latencyInterval = null;

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const initSocket = (onLatencyUpdate) => {
  const token = getAuthToken();
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('⚡ [Socket.io Connected] Secure Gateway active.');

    // Track sub-second latency ping every 4 seconds
    if (latencyInterval) clearInterval(latencyInterval);
    latencyInterval = setInterval(() => {
      if (socket && socket.connected) {
        const start = Date.now();
        socket.emit('ping_latency', start, () => {
          const latency = Date.now() - start;
          if (typeof onLatencyUpdate === 'function') {
            onLatencyUpdate(latency);
          }
        });
      }
    }, 4000);
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ [Socket.io Disconnected]:', reason);
    if (latencyInterval) clearInterval(latencyInterval);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (latencyInterval) clearInterval(latencyInterval);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

