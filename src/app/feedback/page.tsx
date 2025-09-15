'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase/client';

export default function FeedbackPage() {
  const { t } = useTranslation('feedback');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase
      .from('feedback')
      .insert([{ name, email, message }]);

    setLoading(false);

    if (error) {
      console.error(error);
      setError(t('error'));
    } else {
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <p className="mb-6 text-gray-700">{t('intro')}</p>

      {success && (
        <div className="p-3 bg-green-100 text-green-700 rounded mb-4">
          {t('success')}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Имя */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('fields.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('placeholders.name') || ''}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('fields.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('placeholders.email') || ''}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        {/* Сообщение */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('fields.message')}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('placeholders.message') || ''}
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('btn.sending') : t('btn.submit')}
        </button>
      </form>
    </div>
  );
}
