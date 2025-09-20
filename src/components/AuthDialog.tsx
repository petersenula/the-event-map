// components/AuthDialog.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useTranslation } from 'react-i18next';

interface Props {
  show: boolean;
  onClose: () => void;
  setViewCount: (v: number) => void;
}

export default function AuthDialog({ show, onClose, setViewCount }: Props) {
  const { t } = useTranslation();
  const [smsStep, setSmsStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  const handleSmsSend = async () => {
    setSmsLoading(true);
    setSmsError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        setSmsError(error.message);
      } else {
        setSmsStep('enter_code');
        setSmsSent(true);
      }
    } catch (err) {
      setSmsError('Unexpected error');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleVerifySms = async () => {
    setSmsLoading(true);
    setSmsError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: smsCode, type: 'sms' });
      if (error) setSmsError(error.message);
      else window.location.reload();
    } catch (err) {
      setSmsError('Unexpected error');
    } finally {
      setSmsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-neutral-800 bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-[90%] text-center space-y-4 border border-gray-300">
        <h2 className="text-base text-gray-800 font-semibold leading-snug">{t('auth.promo')}</h2>

        <div className="space-y-2">
            <button
            onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: { prompt: 'select_account' }, // всегда выбор аккаунта
                },
                });
                if (error) alert(t('auth.error') + ': ' + error.message);
            }}
            className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
            >
            {t('auth.google')}
            </button>
            <button
                onClick={() => {
                const email = prompt(t('auth.enter_email'));
                if (email) {
                    supabase.auth.signInWithOtp({ email }).then(({ error }) => {
                    if (error) alert(t('auth.email_error') + ': ' + error.message);
                    else alert(t('auth.email_sent'));
                    });
                }
                }}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
            >
                {t('auth.email')}
            </button>

          {smsStep === 'enter_phone' ? (
            <div className="space-y-2">
              <input
                type="tel"
                placeholder={t('auth.phone_placeholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-black px-4 py-2 rounded-full font-semibold text-gray-800"
              />
              <button
                onClick={handleSmsSend}
                disabled={smsLoading}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100 disabled:opacity-60"
              >
                {smsLoading ? t('auth.loading') : t('auth.sms')}
              </button>
              {smsError && <p className="text-red-600 text-sm">{smsError}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                {t('auth.code_sent_to')} <span className="font-medium">{phone}</span>{' '}
                <button type="button" onClick={() => setSmsStep('enter_phone')} className="underline">
                  {t('auth.change_phone')}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('auth.enter_sms_code')}
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                className="w-full border border-black px-4 py-2 rounded-full text-gray-600"
              />
              <button
                onClick={handleVerifySms}
                disabled={smsLoading || !smsCode.trim()}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100 disabled:opacity-60"
              >
                {smsLoading ? t('auth.loading') : t('auth.enter_code')}
              </button>
              {smsError && <p className="text-red-600 text-sm">{smsError}</p>}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setPhone(''); setSmsCode(''); setSmsSent(false);
            onClose(); setViewCount(0);
          }}
          className="text-gray-500 text-sm mt-2 underline"
        >
          {t('auth.no_thanks')}
        </button>
      </div>
    </div>
  );
}
