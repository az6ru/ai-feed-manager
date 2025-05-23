import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router } from 'react-router-dom';

// Объявление типа для window
declare global {
  interface Window {
    saveNavigation: () => void;
  }
}

// Функция для сохранения URL перед обновлением страницы
const saveCurrentUrl = () => {
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  localStorage.setItem('currentUrl', currentPath);
};

// Сохраняем URL при любом изменении location
window.addEventListener('beforeunload', saveCurrentUrl);

// Глобальная функция для сохранения URL при переходах по роутеру
window.saveNavigation = () => {
  saveCurrentUrl();
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  </React.StrictMode>
);
