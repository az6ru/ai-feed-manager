import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FeedProvider } from './context/FeedContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import FeedImport from './pages/FeedImport';
import FeedEditor from './pages/FeedEditor';
import ProductEditor from './pages/ProductEditor';
import Settings from './pages/Settings';
import AuthPage from './pages/Auth';
import { useAuth } from './context/AuthContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div>Загрузка...</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/import" element={<FeedImport />} />
                <Route path="/feeds/:feedId" element={<FeedEditor />} />
                <Route path="/feeds/:feedId/products/:productId" element={<ProductEditor />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </AppLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <FeedProvider>
      <AppRoutes />
    </FeedProvider>
  );
}

export default App;