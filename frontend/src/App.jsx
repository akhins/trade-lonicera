import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Signals from './pages/Signals';
import OpenTrades from './pages/OpenTrades';
import TradeHistory from './pages/TradeHistory';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import SystemLogs from './pages/SystemLogs';
import TickerBar from './components/Layout/TickerBar';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket } from './api/client';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <TickerBar />
      <Sidebar />
      <div className="main-content">
        <Header />
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner" style={{ height: '100vh' }}><div className="spinner"></div></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/signals" element={<ProtectedRoute><AppLayout><Signals /></AppLayout></ProtectedRoute>} />
      <Route path="/open-trades" element={<ProtectedRoute><AppLayout><OpenTrades /></AppLayout></ProtectedRoute>} />
      <Route path="/trade-history" element={<ProtectedRoute><AppLayout><TradeHistory /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
      <Route path="/system-logs" element={<ProtectedRoute><AppLayout><SystemLogs /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppInitializer />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// Component to initialize socket connection
function AppInitializer() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Connect to WebSocket when user is authenticated
      try {
        connectSocket();
      } catch (err) {
        console.warn('Failed to connect to WebSocket:', err.message);
      }
    }
  }, [isAuthenticated]);

  return null;
}
