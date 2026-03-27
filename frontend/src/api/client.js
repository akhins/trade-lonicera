import axios from 'axios';
import { io } from 'socket.io-client';

// API Base URL - Development vs Production
const getApiBaseURL = () => {
  // Netlify environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  
  // Production - Same origin
  return `${window.location.origin}/api`;
};

// Socket.IO URL
const getSocketURL = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  return window.location.origin;
};

// Axios instance
const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - JWT token ekleme
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - 401 yönetimi + retry logic for 5xx errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry logic for 5xx errors (but not 401)
    if (error.response?.status >= 500 && error.response?.status < 600) {
      config.retryCount = config.retryCount || 0;
      const maxRetries = 3;
      
      if (config.retryCount < maxRetries) {
        config.retryCount += 1;
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, config.retryCount - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

// Socket.IO instance
let socket = null;

export function getSocket() {
  if (!socket) {
    const socketUrl = getSocketURL();
    
    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
      path: '/socket.io/'
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export default api;
