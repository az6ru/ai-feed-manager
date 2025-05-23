import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signIn, signUp, signOut, getCurrentUser, getOrCreateProfile } from '../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем текущего пользователя при инициализации
    getCurrentUser().then(async (currentUser) => {
      setUser(currentUser);
      // Если пользователь авторизован, создаем или получаем его профиль
      if (currentUser && currentUser.email) {
        try {
          await getOrCreateProfile({
            id: currentUser.id,
            email: currentUser.email
          });
          console.log('Профиль пользователя получен/создан');
        } catch (error) {
          console.error('Ошибка при получении/создании профиля:', error);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      setUser(data.user);
      
      // Создаем или получаем профиль пользователя после авторизации
      if (data.user && data.user.email) {
        try {
          await getOrCreateProfile({
            id: data.user.id,
            email: data.user.email
          });
          console.log('Профиль пользователя получен/создан после входа');
        } catch (profileError) {
          console.error('Ошибка при получении/создании профиля после входа:', profileError);
        }
      }
      
      return { data };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password);
      if (error) throw error;
      setUser(data.user);
      // При регистрации профиль будет создан автоматически при первом входе
      return { data };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  return ctx;
} 