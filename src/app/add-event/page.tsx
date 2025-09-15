'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import dynamic from 'next/dynamic';
import { TYPES } from '@/lib/constants';
import { GMAPS_ID, GMAPS_LIBS } from '@/lib/gmaps';
import type { ComponentType } from 'react';

const DatePicker = dynamic(() => import('react-datepicker'), { ssr: false });

// Справочники
const FORMATS = ['any', 'children', 'adults'] as const;
const AGES = ['0-2', '3-5', '6-8', '9-12', '13-17', '18+', 'any'] as const;
type Age = typeof AGES[number];
const REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
type Repeat = typeof REPEATS[number];

function AddEventPage() {
  const router = useRouter();
  const { t } = useTranslation('addEvent');

  useEffect(() => {
    // на всякий снимаем всё, что могло запретить прокрутку на странице карты
    document.body.classList.remove('no-page-scroll');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }, []);

  // Google Places (важно использовать один и тот же id/набор библиотек во всём приложении)
  const { isLoaded, loadError } = useJsApiLoader({
    id: GMAPS_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: GMAPS_LIBS,
  });

  // Language switcher
  const [lang, setLang] = useState<string>(i18n.language || 'en');
  const langs = useMemo(
    () => [
      { code: 'de', label: 'Deutsch' },
      { code: 'fr', label: 'Français' },
      { code: 'it', label: 'Italiano' },
      { code: 'en', label: 'English' },
      { code: 'ru', label: 'Русский' },
    ],
    []
  );
  const onLangChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setLang(next);
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };
  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored && stored !== i18n.language) {
      i18n.changeLanguage(stored);
      setLang(stored);
    }
  }, []);

  // Auth (пока не обязательная, просто предлагаем)
  const [session, setSession] = useState<any>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setShowAuthPrompt(!data.session);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setShowAuthPrompt(!s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState('');
  const [repeat, setRepeat] = useState<Repeat>('none');

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [website, setWebsite] = useState('');
  const [contact, setContact] = useState('');
  const [contactName, setContactName] = useState('');

  const [type, setType] = useState('');
  const [format, setFormat] = useState('');
  const [age, setAge] = useState<Age[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onPlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place) return;

    const formatted = place.formatted_address || place.name || '';
    const loc = place.geometry?.location;
    if (formatted) setAddress(formatted);
    if (loc && typeof loc.lat === 'function' && typeof loc.lng === 'function') {
      setCoords({ lat: loc.lat(), lng: loc.lng() });
    }
  };

  const formatDateToSql = (d: Date | null) =>
    d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10) : null;
  const toTime = (s: string) => (s ? `${s}:00` : null);

  const validate = () => {
    if (!title.trim()) return t('errors.title');
    if (!description.trim()) return t('errors.description');
    if (!startDate) return t('errors.startDate');
    if (!endDate) return t('errors.endDate');
    if (endDate < startDate) return t('errors.dateOrder');
    if (!address.trim()) return t('errors.address');
    if (coords.lat == null || coords.lng == null) return t('errors.coords');
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) {
      setError(v as string);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        start_date: formatDateToSql(startDate),
        end_date: formatDateToSql(endDate),
        start_time: toTime(startTime),
        end_time: toTime(endTime),
        repeat: repeat === 'none' ? null : repeat,
        address: address.trim(),
        lat: coords.lat,
        lng: coords.lng,
        website: website.trim() || null,
        contact: contact.trim() || null,
        contact_name: contactName.trim() || null,
        type: type || null,
        format: format || null,
        // ВАЖНО: Postgres text[] — отдаём массив строк (не строку)
        age_group: age.length ? age : null,
        created_by: session?.user?.id ?? null,
        status: 'pending',
      };

      const { error } = await supabase.from('submissions').insert(payload);
      if (error) throw error;

      setSuccess(t('success'));
      // очистка
      setTitle('');
      setDescription('');
      setStartDate(null);
      setStartTime('');
      setEndDate(null);
      setEndTime('');
      setRepeat('none');
      setAddress('');
      setCoords({ lat: null, lng: null });
      setWebsite('');
      setContact('');
      setContactName('');
      setType('');
      setFormat('');
      setAge([]);
    } catch (e: any) {
      setError(e.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-auto bg-gray-50" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* баннер, если Google Maps не загрузились */}
        {loadError && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm">
            {t('errors.mapsLoad') || 'Не удалось загрузить Google Maps. Попробуйте обновить страницу.'}
          </div>
        )}

        <div className="min-h-[100dvh] overflow-y-auto bg-gray-50 py-8">
          <div className="max-w-3xl mx-auto px-4">
            {/* Заголовок + язык */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm">🌐</span>
                <select value={lang} onChange={onLangChange} className="border rounded px-2 py-1 text-sm">
                  {langs.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Нежёсткое предложение войти */}
            {showAuthPrompt && (
              <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm mb-3">{t('authPrompt')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await supabase.auth.signInWithOAuth({ provider: 'google' });
                      } catch {}
                    }}
                    className="px-3 py-2 border rounded bg-gray-50 text-sm"
                  >
                    {t('loginGoogle')}
                  </button>

                  <button
                    onClick={async () => {
                      const email = prompt(t('enterEmail') || 'Email');
                      if (!email) return;
                      const { error } = await supabase.auth.signInWithOtp({ email });
                      if (error) alert(error.message);
                      else alert(t('emailSent'));
                    }}
                    className="px-3 py-2 border rounded bg-gray-50 text-sm"
                  >
                    {t('loginEmail')}
                  </button>

                  <button onClick={() => setShowAuthPrompt(false)} className="px-3 py-2 border rounded text-sm">
                    {t('continueGuest')}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow">
              {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm">{error}</div>}
              {success && <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm">{success}</div>}

              {/* Название */}
              <label className="block text-sm font-medium mb-1">{t('fields.name')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mb-4 rounded border px-3 py-2"
                placeholder={t('placeholders.name') || ''}
              />

              {/* Описание */}
              <label className="block text-sm font-medium mb-1">{t('fields.description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mb-4 h-28 rounded border px-3 py-2"
                placeholder={t('placeholders.description') || ''}
              />

              {/* Даты/время/повтор */}
              <div className="flex flex-wrap gap-4 items-end">
                {/* Start Date */}
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">{t('fields.startDate')}</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => setStartDate(date)}
                      dateFormat="dd.MM.yyyy"
                      className="border p-2 rounded w-[140px]"
                    />
                </div>

                {/* Start Time */}
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">{t('fields.startTime')}</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="border p-2 rounded w-[100px]"
                  />
                </div>

                {/* End Date */}
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">{t('fields.endDate')}</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => setEndDate(date)}
                    minDate={startDate || undefined}
                    dateFormat="dd.MM.yyyy"
                    className="border p-2 rounded w-[140px]"
                  />
                </div>

                {/* End Time */}
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">{t('fields.endTime')}</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border p-2 rounded w-[100px]"
                  />
                </div>

                {/* Repeat */}
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">{t('fields.repeat')}</label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as Repeat)}
                    className="border p-2 rounded w-[140px]"
                  >
                    <option value="none">{t('repeat.none')}</option>
                    <option value="daily">{t('repeat.daily')}</option>
                    <option value="weekly">{t('repeat.weekly')}</option>
                    <option value="monthly">{t('repeat.monthly')}</option>
                    <option value="yearly">{t('repeat.yearly')}</option>
                  </select>
                </div>
              </div>

              {/* Адрес + координаты */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">{t('fields.address')}</label>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Адрес */}
                  <div className="flex-grow min-w-[260px]">
                    {isLoaded ? (
                      <Autocomplete onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={onPlaceChanged}>
                        <input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full rounded border px-3 py-2 h-[42px]"
                          placeholder={t('placeholders.address') || ''}
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded border px-3 py-2 h-[42px]"
                        placeholder={t('placeholders.address') || ''}
                      />
                    )}
                  </div>

                  {/* lat */}
                  <input
                    type="number"
                    step="any"
                    value={coords.lat ?? ''}
                    onChange={(e) =>
                      setCoords((c) => ({ ...c, lat: e.target.value === '' ? null : Number(e.target.value) }))
                    }
                    className="rounded border px-3 py-2 w-[120px] h-[42px]"
                    placeholder="lat"
                  />

                  {/* lng */}
                  <input
                    type="number"
                    step="any"
                    value={coords.lng ?? ''}
                    onChange={(e) =>
                      setCoords((c) => ({ ...c, lng: e.target.value === '' ? null : Number(e.target.value) }))
                    }
                    className="rounded border px-3 py-2 w-[120px] h-[42px]"
                    placeholder="lng"
                  />
                </div>
              </div>

              {/* Сайт */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">{t('fields.website')}</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder={t('placeholders.website') || ''}
                />
              </div>

              {/* Имя + Email/Телефон */}
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Имя */}
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">{t('fields.contactName')}</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="rounded border px-3 py-2 h-[42px] w-full"
                      placeholder={t('placeholders.contactName') || ''}
                    />
                  </div>

                  {/* Email или телефон */}
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">{t('fields.contact')}</label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="rounded border px-3 py-2 h-[42px] w-full"
                      placeholder={t('placeholders.contact') || ''}
                    />
                  </div>
                </div>
              </div>

              {/* Тип + Формат + Возраст */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Тип */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-medium mb-1">{t('fields.type')}</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded border px-3 h-[42px]">
                    <option value="">{t('placeholders.select')}</option>
                    {TYPES.map((v) => (
                      <option key={v} value={v}>
                        {t(`types.${v}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Формат */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-medium mb-1">{t('fields.format')}</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded border px-3 h-[42px]">
                    <option value="">{t('placeholders.select')}</option>
                    {FORMATS.map((v) => (
                      <option key={v} value={v}>
                        {t(`formats.${v}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Возраст */}
                <div className="flex-[2] min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">{t('fields.age')}</label>
                  <div className="flex flex-wrap items-center gap-3 rounded border px-3 py-2">
                    {AGES.map((a) => (
                      <label key={a} className="inline-flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={age.includes(a)}
                          onChange={() =>
                            setAge((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
                          }
                        />
                        <span>{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button disabled={loading} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60">
                  {loading ? t('btn.loading') : t('btn.submit')}
                </button>
                <button type="button" onClick={() => router.back()} className="rounded border px-4 py-2">
                  {t('btn.cancel')}
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs text-gray-500">{t('legalNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AddEventPage), { ssr: false });


