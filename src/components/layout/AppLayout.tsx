import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Home, Upload, Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Компонент для отслеживания изменений URL
function UrlTracker() {
  const location = useLocation();
  
  useEffect(() => {
    // Сохраняем URL при каждом изменении маршрута
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('currentUrl', currentPath);
    console.log('Сохранен URL:', currentPath);
  }, [location]);
  
  return null;
}

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

// Модифицируем компонент Link для сохранения URL
const SavedLink = (props: React.ComponentProps<typeof Link>) => {
  const handleClick = () => {
    // Сохраняем URL перед переходом
    if (typeof props.to === 'string') {
      localStorage.setItem('currentUrl', props.to);
      console.log('SavedLink: сохранен URL:', props.to);
    }
  };
  
  return <Link {...props} onClick={handleClick} />;
};

function NavItem({ to, icon, label, active }: NavItemProps) {
  return (
    <div className={`mb-1 ${active ? 'bg-blue-50 text-blue-700' : ''}`}>
      <SavedLink
        to={to}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
          active
            ? 'text-blue-700'
            : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        <span className="mr-3">{icon}</span>
        <span>{label}</span>
      </SavedLink>
    </div>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  
  // Закрывать меню при смене маршрута на мобильных устройствах
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <UrlTracker />
      
      {/* Overlay для мобильных устройств */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-10 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-20 transition-transform duration-300 ease-in-out transform 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:relative lg:translate-x-0
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="text-xl font-semibold text-blue-600 dark:text-blue-400">YML Feed Manager</Link>
          <button 
            className="lg:hidden p-2 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" 
            onClick={toggleSidebar}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="mt-4">
          <ul className="space-y-2 px-2">
            <li>
              <Link 
                to="/" 
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium
                  ${location.pathname === '/' 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'}
                `}
              >
                <Home size={18} className="mr-3" />
                Дашборд
              </Link>
            </li>
            <li>
              <Link 
                to="/import" 
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium
                  ${location.pathname === '/import' 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'}
                `}
              >
                <Upload size={18} className="mr-3" />
                Импорт фида
              </Link>
            </li>
            <li>
              <Link 
                to="/settings" 
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium
                  ${location.pathname === '/settings' 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'}
                `}
              >
                <Settings size={18} className="mr-3" />
                Настройки
              </Link>
            </li>
          </ul>
          <div className="px-3 mt-6 pb-3 border-t border-gray-200 dark:border-gray-700">
            <button 
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 mt-4 w-full text-left rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <LogOut size={18} className="mr-3" />
              Выйти
            </button>
          </div>
        </nav>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 lg:px-6">
          <button 
            className="p-2 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden" 
            onClick={toggleSidebar}
          >
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center">
            <button className="p-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <User size={20} />
            </button>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;