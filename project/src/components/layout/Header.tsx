import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, User } from 'lucide-react';
import { useFeed } from '../../context/FeedContext';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const Header = ({ onMenuClick, sidebarOpen }: HeaderProps) => {
  const location = useLocation();
  const { currentFeed } = useFeed();
  
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path === '/import') return 'Import Feed';
    if (path.startsWith('/feeds') && currentFeed) {
      if (path.includes('/products/')) return `Edit Product - ${currentFeed.name}`;
      return `Feed Editor - ${currentFeed.name}`;
    }
    if (path === '/settings') return 'Settings';
    
    return 'YML Feed Manager';
  };
  
  return (
    <header className="sticky top-0 z-20 flex items-center h-16 px-6 bg-white border-b border-gray-200">
      <button 
        className="p-1 mr-4 rounded-md hover:bg-gray-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-500" />
      </button>
      
      <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
      
      <div className="flex items-center ml-auto space-x-4">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="w-64 py-2 pl-10 pr-4 text-sm bg-gray-100 border border-transparent rounded-md focus:outline-none focus:bg-white focus:border-blue-300"
            aria-label="Search"
          />
          <Search className="absolute w-5 h-5 text-gray-400 left-3 top-2" />
        </div>
        
        <button 
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-gray-500" />
        </button>
        
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
};

export default Header;