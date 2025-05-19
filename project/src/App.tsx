import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FeedProvider } from './context/FeedContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import FeedImport from './pages/FeedImport';
import FeedEditor from './pages/FeedEditor';
import ProductEditor from './pages/ProductEditor';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <FeedProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<FeedImport />} />
            <Route path="/feeds/:feedId" element={<FeedEditor />} />
            <Route path="/feeds/:feedId/products/:productId" element={<ProductEditor />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppLayout>
      </FeedProvider>
    </Router>
  );
}

export default App;