import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Dashboard } from './pages/Dashboard';
import { LiveAuction } from './pages/LiveAuction';
import { Admin } from './pages/admin/Admin';

// Very small router: the part after # in the address decides which page to show.
//   /        -> public view      /live  -> live auction room      /admin -> admin panel
function App() {
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || '/');
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  if (route.startsWith('/live')) return <LiveAuction />;
  if (route.startsWith('/admin')) return <Admin />;
  return <Dashboard />;
}

createRoot(document.getElementById('root')).render(<App />);
