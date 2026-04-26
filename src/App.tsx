import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Dashboard } from './views/Dashboard';
import { Reader } from './views/Reader';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useLibraryStore } from './store/useLibraryStore';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/read/:id" element={<Reader />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { initAuth } = useLibraryStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Router>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#1e1e1e',
          color: '#fff',
          border: '1px solid #27272a',
        }
      }} />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
