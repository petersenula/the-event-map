'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';

type Props = {
  showAuthPrompt: boolean;
};

const AuthModalPromo = ({ showAuthPrompt }: Props) => {
  const [session, setSession] = useState<Session | null>(null);

  // проверка текущей сессии
  useEffect(() => {
    const getCurrentSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Ошибка при получении сессии:', error);
      else setSession(data.session);
    };

    getCurrentSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // вход через magic link
  const handleEmailSignIn = async () => {
    const email = prompt('Введите ваш email для входа:');
    if (email) {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        alert('Ошибка при отправке ссылки: ' + error.message);
      } else {
        alert('Ссылка отправлена! Проверьте почту.');
      }
    }
  };

  if (!showAuthPrompt || session) return null;

  return (
    <div className="fixed inset-0 bg-gray-200 bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 text-center space-y-4">
        <h2 className="text-lg font-bold">
          Чтобы продолжить, пожалуйста, зарегистрируйтесь!
        </h2>

        <div className="space-y-2">
          <button
            onClick={handleEmailSignIn}
            className="w-full border border-gray-500 text-black px-4 py-2 rounded hover:bg-gray-100"
          >
            Войти по электронной почте
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModalPromo;
