import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  redirectPath = '/auth' 
}) => {
  const { user, loading } = useAuth();

  // Добавляем отладочное сообщение при монтировании и изменении состояния
  useEffect(() => {
    console.log('ProtectedRoute - Состояние авторизации:', { 
      isAuthenticated: !!user, 
      isLoading: loading, 
      userId: user?.id,
      email: user?.email,
      timestamp: new Date().toISOString()
    });
  }, [user, loading]);

  // Показываем индикатор загрузки, пока проверяем авторизацию
  if (loading) {
    console.log('ProtectedRoute - Загрузка в процессе...');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-500">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!user) {
    console.log('ProtectedRoute - Нет авторизации, перенаправление на', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  // Если пользователь авторизован, отображаем защищенный контент
  console.log('ProtectedRoute - Доступ разрешен, рендерим защищенный контент');
  return <Outlet />;
};

export default ProtectedRoute; 