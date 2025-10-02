// components/AuthDialog.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useTranslation } from 'react-i18next';
import { useSessionReady } from '@/hooks/useSessionReady';

interface Props {
  show: boolean;
  onClose: () => void;
  setViewCount: (v: number) => void;
}

export default function AuthDialog({ show, onClose, setViewCount }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'main' | 'sms_phone' | 'sms_code'>('main');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const ready = useSessionReady();
  const [noThanksCount, setNoThanksCount] = useState(0);

  const isPhoneValid = /^\+\d{8,15}$/.test(phone);
  const isCodeValid = /^\d{6,}$/.test(smsCode);

  const handleSmsSend = async () => {
    setSmsError(null);
    setSmsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        setSmsError(error.message);
      } else {
        setStep('sms_code');
      }
    } catch (err: any) {
      console.error('❌ Ошибка при отправке SMS:', err);
      setSmsError(t('auth.unexpected_error'));
    } finally {
      setSmsLoading(false);
    }
  };

  const handleVerifySms = async () => {
    setSmsError(null);
    setSmsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: smsCode,
        type: 'sms',
      });

      if (error) {
        setSmsError(error.message);
        setSmsError(t('auth.code_error'));
      }
    } catch (err: any) {
      console.error('SMS login exception', err);
      setSmsError(t('auth.unexpected_error'));
    } finally {
      setSmsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Блюр */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30" />

      {/* Модалка */}
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-[90%] text-center space-y-4 border border-gray-300">
          <h2 className="text-base text-gray-800 font-semibold leading-snug">
            {t('auth.promo')}
          </h2>

          {step === 'main' && (
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                      queryParams: { prompt: 'select_account' },
                    },
                  });
                  if (error) alert(t('auth.error') + ': ' + error.message);
                }}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
              >
                {t('auth.google')}
              </button>

              <button
                onClick={async () => {
                  const email = prompt(t('auth.enter_email'));
                  if (email) {
                    const { error } = await supabase.auth.signInWithOtp({ email });
                    if (error) alert(t('auth.email_error') + ': ' + error.message);
                    else alert(t('auth.email_sent'));
                  }
                }}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
              >
                {t('auth.email')}
              </button>

              <button
                onClick={() => {
                  setStep('sms_phone');
                  setSmsError(null);
                }}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
              >
                {t('auth.sms')}
              </button>
            </div>
          )}

          {step === 'sms_phone' && (
            <div className="space-y-2">
              <input
                type="tel"
                placeholder={t('auth.phone_placeholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full border px-4 py-2 rounded-full font-semibold text-gray-800 ${
                  smsError ? 'border-red-500' : 'border-black'
                }`}
              />
              <button
                onClick={handleSmsSend}
                disabled={!isPhoneValid || smsLoading}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100 disabled:opacity-60"
              >
                {smsLoading ? t('auth.loading') : t('auth.send_code')}
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut(); // 👈 очищаем незавершённые токены
                  setStep('main');
                  setPhone('');
                  setSmsCode('');
                  setSmsError(null);
                }}
                className="text-gray-500 text-sm underline"
              >
                {t('auth.other_method')}
              </button>
              {smsError && <p className="text-red-600 text-sm">{smsError}</p>}
            </div>
          )}

          {step === 'sms_code' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                {t('auth.code_sent_to')} <span className="font-medium">{phone}</span>
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
                disabled={!isCodeValid || smsLoading}
                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100 disabled:opacity-60"
              >
                {smsLoading ? t('auth.loading') : t('auth.enter_code')}
              </button>
              <button
                onClick={() => setStep('main')}
                className="text-gray-500 text-sm underline"
              >
                {t('auth.other_method')}
              </button>
              {smsError && <p className="text-red-600 text-sm">{smsError}</p>}
            </div>
          )}

          {noThanksCount < 1 && step === 'main' && (
            <button
              onClick={() => {
                setNoThanksCount(noThanksCount + 1);
                setPhone('');
                setSmsCode('');
                setStep('main');
                onClose();
                setViewCount(0);
              }}
              className="text-gray-500 text-sm mt-2 underline"
            >
              {t('auth.no_thanks')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
