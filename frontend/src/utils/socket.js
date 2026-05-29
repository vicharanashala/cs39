import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

/**
 * Initialise (or return existing) Socket.IO connection.
 * Pass the JWT token so the server can authenticate the user and join them to their private room.
 */
export function initSocket(token) {
  if (socket && socket.connected) {
    // If token changed, disconnect old socket and reconnect
    if (socket.auth?.token !== token) {
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

/**
 * Return the current socket instance (null if not connected).
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect socket (e.g. on logout).
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to a real-time SP gain/loss notification.
 * Handler receives: { pointsChange, reason, newTotal, level }
 */
export function onSPChange(handler) {
  if (!socket) return () => {};
  const currentSocket = socket;
  currentSocket.on('sp_gained', handler);
  currentSocket.on('sp_lost', handler);
  return () => {
    currentSocket.off('sp_gained', handler);
    currentSocket.off('sp_lost', handler);
  };
}

/**
 * Subscribe to real-time answer notifications.
 * Handler receives: { threadId, threadTitle, answerAuthor }
 */
export function onAnswerReceived(handler) {
  if (!socket) return () => {};
  const currentSocket = socket;
  currentSocket.on('answer_received', handler);
  return () => currentSocket.off('answer_received', handler);
}

/**
 * Subscribe to answer verified events.
 * Handler receives: { threadId, answerId }
 */
export function onAnswerVerified(handler) {
  if (!socket) return () => {};
  const currentSocket = socket;
  currentSocket.on('answer_verified', handler);
  return () => currentSocket.off('answer_verified', handler);
}

/**
 * Subscribe to new notification arrivals.
 * Handler receives the notification object.
 */
export function onNewNotification(handler) {
  if (!socket) return () => {};
  const currentSocket = socket;
  currentSocket.on('notification', handler);
  return () => currentSocket.off('notification', handler);
}
