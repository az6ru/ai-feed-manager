import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FeedProvider } from './context/FeedContext';
import { ThemeProvider } from './context/ThemeContext';
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

// Компонент для восстановления URL при обновлении страницы
const UrlPreserver = () => {
  // Восстанавливаем URL при загрузке страницы
  useEffect(() => {
    // Проверяем, есть ли сохранённый URL
    const url = localStorage.getItem('currentUrl');
    if (url && window.location.pathname === '/') {
      // Перенаправляем на сохранённый URL через iframe
      window.history.replaceState(null, '', url);
    }
  }, []);

  // Сохраняем текущий URL при каждом изменении
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem('currentUrl', window.location.pathname + window.location.search);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return null;
};

function AppRoutes() {
  return (
    <>
      <UrlPreserver />
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
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FeedProvider>
        <AppRoutes />
      </FeedProvider>
    </ThemeProvider>
  );
}

export default App;