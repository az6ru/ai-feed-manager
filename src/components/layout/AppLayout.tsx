import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Upload, Settings, Database, Bell, User, Menu } from 'lucide-react';
import Button from './Button';
import { AuthProvider, useAuth } from '../../context/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
}

const NavItem = ({ to, icon, text, isActive }: NavItemProps) => {
  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className="flex-shrink-0 mr-2">{icon}</span>
      <span className="font-medium">{text}</span>
    </Link>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, signOut } = useAuth();

  return (
    <AuthProvider>
      <div className="flex flex-col h-screen bg-gray-50 font-sans">
        {/* Верхняя панель навигации */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Логотип */}
              <div className="flex items-center">
                <Link to="/" className="flex items-center gap-2">
                  <div className="flex items-center justify-center bg-blue-600 text-white rounded-md w-8 h-8">
                    <Database className="h-4 w-4" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">FeedMaster</span>
                </Link>
              </div>
              
              {/* Навигация */}
              <nav className="hidden md:flex items-center space-x-2">
                <NavItem
                  to="/"
                  icon={<LayoutGrid className="h-5 w-5" />}
                  text="Dashboard"
                  isActive={pathname === '/'}
                />
                <NavItem
                  to="/import"
                  icon={<Upload className="h-5 w-5" />}
                  text="Import Feed"
                  isActive={pathname === '/import'}
                />
                <NavItem
                  to="/settings"
                  icon={<Settings className="h-5 w-5" />}
                  text="Settings"
                  isActive={pathname === '/settings'}
                />
              </nav>
              
              {/* Кнопки действий */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </Button>
                {/* Отображение email и кнопка выхода */}
                {user && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-700 text-sm">{user.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      aria-label="Выйти"
                      onClick={signOut}
                    >
                      Выйти
                    </Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500"
                  aria-label="User menu"
                >
                  <User className="h-5 w-5" />
                </Button>
                
                {/* Мобильное меню (видимо только на мобильных устройствах) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-gray-500"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Основной контент */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto px-4 py-4">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
};

export default AppLayout;