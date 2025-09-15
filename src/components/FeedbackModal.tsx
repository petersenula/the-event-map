'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase/client';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FeedbackModal({ open, onClose }: Props) {
  const { t } = useTranslation('feedback');

  // ЛОКАЛЬНЫЕ состояния — больше не в родителе!
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Блокируем прокрутку страницы под модалкой
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { setError(t('message_required')); return; }
    setError(null);
    setLoading(true);
    try {
      // берём актуальную сессию (если гость — user_id будет null)
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      const { error } = await supabase
        .from('feedback')
        .insert([{ user_id: userId, name: name || null, email: email || null, message: message.trim() }]);

      if (error) throw error;
      setSuccess(true);
      setName(''); setEmail(''); setMessage('');
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (e: any) {
      setError(e?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md space-y-4"
             onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t('title')}</h2>
            <button onClick={onClose}>✕</button>
          </div>

          {success && <p className="text-green-600">{t('success')}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('message')}
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? t('sending') : t('send')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // ПОРТАЛ — рисуем модалку поверх всего, отдельно от карты
  return createPortal(modal, document.body);
}
