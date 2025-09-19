'use client';

export const runtime = 'nodejs';

import { useEffect, useState, useRef, useCallback, useMemo, type ChangeEvent} from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader} from '@react-google-maps/api';
import { supabase } from '@/utils/supabase/client';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import ClientOnly from '@/components/ClientOnly';
import ru from 'date-fns/locale/ru';
import enUS from 'date-fns/locale/en-US';
import fr from 'date-fns/locale/fr';
import de from 'date-fns/locale/de';
import it from 'date-fns/locale/it';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useIsMobile';
import { GMAPS_ID, GMAPS_LIBS } from '@/lib/gmaps';
import FeedbackModal from '@/components/FeedbackModal';
import { useRouter } from 'next/navigation';
import { Heart, Share2, CalendarPlus, MapPin, CalendarDays, Calendar, Link as LinkIcon, RefreshCw, Search, User, Home, Filter, List, X, Copy } from 'lucide-react';
import MemoizedMap from '../components/MemoizedMap';
import HomeLocationModal from '@/components/HomeLocationModal';
import cn from 'classnames';
import DesktopOverlay from '@/components/overlays/DesktopOverlay';
import MobileOverlay from "@/components/overlays/MobileOverlay";
import MapLayer from '@/components/MapLayer'; 
import { isDateInRange } from '../lib/date';
import AuthDialog from '@/components/AuthDialog';

const DatePicker = dynamic(() => import('react-datepicker'), { ssr: false });

type EventId = string | number;
type ItemWithId = { id: EventId };

type EventRowWithAge = {
  age_group?: string | string[] | null;
};

const containerStyle = {
  width: 'calc(100% - 10mm)',
  height: 'calc(100% - 10mm)',
  margin: '5mm',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

const center = { lat: 47.378177, lng: 8.540192 };

const availableLanguages = [
  { code: 'de', label: 'Deutsch', locale: de },
  { code: 'fr', label: 'Français', locale: fr },
  { code: 'it', label: 'Italiano', locale: it },
  { code: 'en', label: 'English', locale: enUS },
  { code: 'ru', label: 'Русский', locale: ru }
];

const markerColors: Record<string, string> = {
  'культура': 'red',
  'выставка': 'red',
  'спектакль': 'red',
  'живопись': 'red',
  'наука': 'green',
  'спорт': 'blue',
  'природа': 'green',
  'здоровье': 'blue',
  'танцы': 'pink',
  'музыка': 'pink',
  'технологии': 'green',
  'общение': 'ltblue',
  'обучение': 'green',
  'книги': 'green',
  'лекция': 'green',
  'квест': 'orange',
  'мастеркласс': 'ltblue',
  'развлечение': 'orange',
  'игра': 'orange',
  'детское': 'pink',
  'кино': 'red',
  'развлекательные центры': 'orange',
  'клубы и ночная жизнь': 'purple',
  'ярмарка': 'purple',
  'еда': 'yellow',
  'фестиваль': 'purple',
  'автомобили': 'ltblue',
  'религия': 'orange',
  'другое': 'ltblue',
};

const typeTranslationKeys: Record<string, string> = {
  'культура': 'types.culture',
  'выставка': 'types.exhibition',
  'спектакль': 'types.performance',
  'живопись': 'types.painting',
  'наука': 'types.science',
  'спорт': 'types.sport',
  'природа': 'types.nature',
  'здоровье': 'types.health',
  'танцы': 'types.dance',
  'музыка': 'types.music',
  'технологии': 'types.technology',
  'общение': 'types.communication',
  'обучение': 'types.learning',
  'книги': 'types.books',
  'лекция': 'types.lecture',
  'квест': 'types.quest',
  'мастеркласс': 'types.masterclass',
  'развлечение': 'types.entertainment',
  'игра': 'types.game',
  'детское': 'types.kids',
  'кино': 'types.cinema',
  'развлекательные центры': 'types.entertainment_centers',
  'клубы и ночная жизнь': 'types.clubs_and_nightlife',
  'ярмарка': 'types.fair',
  'еда': 'types.food',
  'фестиваль': 'types.festival',
  'автомобили': 'types.cars',
  'религия': 'types.religion',
  'другое': 'types.other',
};

const ITEMS_PER_LOAD = 50;

type DateRange = {
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}[];

function RefreshSpinner() {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 bg-black/70 text-white px-4 py-2 rounded-xl shadow-lg z-50">
      <svg
        className="animate-spin h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
      <span>Обновляем...</span>
    </div>
  );
}

export default function EventMap() {
  const [mapReady, setMapReady] = useState(false);
  const isMobile = useIsMobile(768);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [showFavoritesList, setShowFavoritesList] = useState(false);

  const [showHomeModal, setShowHomeModal] = useState(false);
  const handleHomeClick = () => {
    if (!session) {
      setShowAuthPrompt(true);
    } else {
      setShowHomeModal(true);
    }
  };
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const keep = new Set([
      'map_center',
      'map_zoom',
      'lang',
      'home_coords',    // дом
    ]);

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-')) continue; // ⚠️ НЕ трогаем supabase-сессию
      if (!keep.has(key)) localStorage.removeItem(key);
    }
  }, []);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);

  const resetEvents = () => {
    setEvents([]);
    setFilteredEvents([]);
    loadedEventIds.current.clear();
  };

  const [session, setSession] = useState<any>(null);

  const userDisplay = useMemo(() => {
    const u = session?.user;
    if (!u) return '';
    const name =
      (u.user_metadata?.name || u.user_metadata?.full_name || '').trim();
    if (name) return name;
    if (u.email) return u.email || '';
    if (u.phone) return u.phone || '';
    return '';
  }, [session]);

  const loadedEventIds = useRef<Set<string>>(new Set());

  const ensureBounds = async (): Promise<google.maps.LatLngBounds | null> => {
    let tries = 0;
    while (tries < 50) {             // ~7.5 сек максимум при delay=150ms
      const map = mapRef.current;
      if (map) {
        const b = map.getBounds?.();
        if (b) return b;
      }
      await new Promise(r => setTimeout(r, 150));
      tries++;
    }
    console.warn('[ensureBounds] не дождались границ');
    return null;
  };

  const waitForReadyMapAndBoundsAndSession = async (): Promise<google.maps.LatLngBounds | null> => {
    // 1. ⏳ Ждём восстановления сессии
    let tries = 0;
    const maxSessionTries = 10;
    const sessionDelay = 300;

    while (tries < maxSessionTries) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session || tries === maxSessionTries - 1) {
        if (session) {
          console.log('[waitForReadyMapAndBoundsAndSession] сессия восстановлена');
        } else {
          console.warn('[waitForReadyMapAndBoundsAndSession] сессия не восстановлена, продолжаем без неё');
        }
        break;
      }

      console.log(`[waitForReadyMapAndBoundsAndSession] сессия не восстановлена, попытка ${tries + 1}`);
      await new Promise((r) => setTimeout(r, sessionDelay));
      tries++;
    }

    // 2. ⏳ Ждём карту и границы
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 50 * 200ms = 10 секунд

      const tryGetBounds = () => {
        if (!mapReady || !mapRef.current) {
          console.log('[waitForReadyMapAndBoundsAndSession] карта ещё не готова, повтор через 200мс');
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn('[waitForReadyMapAndBoundsAndSession] карта так и не готова, отмена');
            resolve(null);
            return;
          }
          setTimeout(tryGetBounds, 200);
          return;
        }

        const currentBounds = mapRef.current.getBounds?.();
        if (!currentBounds) {
          console.log('[waitForReadyMapAndBoundsAndSession] границы ещё не готовы, повтор через 200мс');
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn('[waitForReadyMapAndBoundsAndSession] границы так и не появились, отмена');
            resolve(null);
            return;
          }
          setTimeout(tryGetBounds, 200);
          return;
        }

        console.log('[waitForReadyMapAndBoundsAndSession] карта и границы готовы');
        resolve(currentBounds);
      };

      tryGetBounds();
    });
  };

  const fetchingRef = useRef(false);

  async function waitForSessionRestore(timeoutMs = 3000): Promise<boolean> {
    const start = Date.now();

    for (;;) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return true;

      if (Date.now() - start > timeoutMs) return false;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const handleMapSoftReload = () => {
    const center = mapRef.current?.getCenter?.()?.toJSON?.();
    const zoom = mapRef.current?.getZoom?.();
    if (center && zoom !== undefined) {
      localStorage.setItem('map_reload_center', JSON.stringify(center));
      localStorage.setItem('map_reload_zoom', zoom.toString());
      localStorage.setItem('map_reload_triggered', 'true'); // ⚠️ чтобы понять, что был soft reload
    }
    window.location.reload();
  };

  const fetchEventsInBounds = useCallback(
    async (
      maybeBounds?: google.maps.LatLngBounds | null,
      _opts?: { force?: boolean } // оставим сигнатуру, но дубликаты всё равно режем
    ) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const bounds = maybeBounds ?? (await ensureBounds());
        if (!bounds) return;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const minLat = sw.lat(), maxLat = ne.lat();
        const minLng = sw.lng(), maxLng = ne.lng();

        const pageSize = 200;
        let page = 0;
        const newly: any[] = [];

        for (;;) {
          const from = page * pageSize;
          const to   = from + pageSize - 1;

          const { data, error } = await supabase
            .from('events')
            .select('*')
            .gte('lat', minLat).lte('lat', maxLat)
            .gte('lng', minLng).lte('lng', maxLng)
            .range(from, to);

          if (error) { console.error('fetch error:', error); break; }

          const batch = data ?? [];
          if (batch.length === 0) break;

          // ✅ всегда режем дубли по строковому id
          const fresh = batch.filter(ev => !loadedEventIds.current.has(String(ev.id)));

          for (const ev of fresh) {
            const parsedLat = parseFloat(ev.lat);
            const parsedLng = parseFloat(ev.lng);
            const normType  = normalizeType(ev.type);
            newly.push({ ...ev, lat: parsedLat, lng: parsedLng, types: normType });
            loadedEventIds.current.add(String(ev.id));
          }

          if (batch.length < pageSize) break;
          page++;
        }

        if (newly.length) {
          setEvents(prev => [...prev, ...newly]);
          setFilteredEvents(prev => [...prev, ...newly]);
        }
      } catch (e) {
        console.error('fetchEventsInBounds failed:', e);
      } finally {
        fetchingRef.current = false;
      }
    },
    [setEvents, setFilteredEvents]
  );


  useEffect(() => {
    const onVisibleOrFocus = () => {
      const centerRaw = typeof window !== 'undefined' ? localStorage.getItem('map_center') : null;
      const zoomRaw = typeof window !== 'undefined' ? localStorage.getItem('map_zoom') : null;

      if (centerRaw && zoomRaw && mapRef.current) {
        try {
          const parsedCenter = JSON.parse(centerRaw);
          const parsedZoom = parseInt(zoomRaw, 10);
          mapRef.current.setCenter(parsedCenter);
          mapRef.current.setZoom(parsedZoom);
          console.log('[onVisibleOrFocus] восстановили карту из map_center/map_zoom');
        } catch (e) {
          console.warn('[onVisibleOrFocus] не смогли восстановить центр/зум');
        }
      }

      handleMapSoftReload();
    };

    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener('focus', onVisibleOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener('focus', onVisibleOrFocus);
    };
  }, []);
  
  const translateTypeUI = useCallback((type: string) => {
    const key = (typeTranslationKeys as Record<string, string>)[type];
    if (!key) return type;
    const translated = t(key);
    return translated && translated !== key ? translated : type;
  }, [t]);
  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };
  useEffect(() => {
    console.log('🌍 Новый язык выбран:', i18n.language);
  }, [i18n.language]);

  type EventRow = {
    // текущие поля
    description?: string | null;
    description_en?: string | null;
    description_de?: string | null;
    description_fr?: string | null;
    description_it?: string | null;
    description_ru?: string | null;

    // альтернативные/legacy поля из БД
    event_description?: string | null;
    event_description_en?: string | null;
    event_description_de?: string | null;
    event_description_fr?: string | null;
    event_description_it?: string | null;
    event_description_ru?: string | null;
  };

  const getDescription = (event: EventRow): string => {
    // "ru-RU" -> "ru", "de-CH" -> "de" и т.п.
    const lang = (i18n.language?.split?.('-')[0] ?? 'en').toLowerCase();

    // Берём язык-специфичные поля, затем общие, затем хоть что-то
    const byLang = {
      en: event.event_description_en ?? event.description_en,
      de: event.event_description_de ?? event.description_de,
      fr: event.event_description_fr ?? event.description_fr,
      it: event.event_description_it ?? event.description_it,
      ru: event.event_description_ru ?? event.description_ru,
    } as const;

    return (
      byLang[lang as keyof typeof byLang] ??
      event.event_description ??
      byLang.en ?? byLang.de ?? byLang.ru ??
      event.description ??
      ''
    );
  };

  const { isLoaded } = useJsApiLoader({
    id: GMAPS_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: GMAPS_LIBS,
  });

  const [loadError, setLoadError] = useState<string | null>(null);
  const mapStatus = !isLoaded ? 'loading' : (loadError ? 'error' : 'ready');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        console.log('🔁 Сессия восстановлена:', data.session);
        setIsAuthenticated(true);
      } else {
        console.log('❌ Сессия отсутствует:', error);
        setIsAuthenticated(false);
      }
    };

    checkSession();

    // 🧠 При возвращении на экран — ещё раз проверяем
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // 📣 Подписка на изменение авторизации

  const [viewCount, setViewCount] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // прочие состояния/ссылки
  const [translatedText, setTranslatedText] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const listRef = useRef<HTMLDivElement>(null!);

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [dateRange, setDateRange] = useState<DateRange>([
    {
      startDate: today,
      endDate: nextMonth,
      key: 'selection',
    },
  ]);
  const [filterAge, setFilterAge] = useState<string[]>([]);
  const [filterFormat, setFilterFormat] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterPrice, setFilterPrice] = useState<string>('');
  const [viewedEvents, setViewedEvents] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showing, setShowing] = useState<'all'|'viewed'|'favorites'>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventId | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD);
  const [showFilters, setShowFilters] = useState(true);
  const [showEventList, setShowEventList] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  console.log('🔍 EVENTS', events);
  console.log('🔍 FILTERS', {
    searchQuery,
    filterType,
    filterFormat,
    filterAge,
    dateRange,
  });

  const filteredByView = useMemo(() => {
    function isDateInRange(event: any): boolean {
      if (!event || !event.start_date || !event.end_date) return false;

      const range = dateRange?.[0];
      if (!range || !range.startDate || !range.endDate) return true;

      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);

      // Защита от некорректных дат
      if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return false;

      return (
        eventEnd >= range.startDate &&
        eventStart <= range.endDate
      );
    }

    const query = searchQuery.toLowerCase().trim();

    const result = events.filter((ev) => {
      const matchesSearch =
        !query ||
        [
          ev.title,
          ev.address,
          ev.description,
          ev.description_en,
          ev.description_de,
          ev.description_fr,
          ev.description_it,
          ev.description_ru,
        ].some(
          (field) =>
            typeof field === 'string' &&
            field.toLowerCase().includes(query)
        );

      const matchesType =
        !filterType.length || ev.types?.some((type: string) => filterType.includes(type));

      const matchesFormat =
        !filterFormat.length || filterFormat.includes(ev.format);

      const matchesAge =
        !filterAge.length || ev.age_group?.some((age: string) => filterAge.includes(age));

      const matchesDate = isDateInRange(ev);

      return matchesSearch && matchesType && matchesFormat && matchesAge && matchesDate;
    });

    console.log('[FILTERED VIEW]', {
      searchQuery,
      filterType,
      filterFormat,
      filterAge,
      dateRange,
      filteredCount: result.length,
    });

    return result;
  }, [events, searchQuery, filterType, filterFormat, filterAge, dateRange]);


  // sms auth
  const [smsStep, setSmsStep] = useState<'enter_phone'|'enter_code'>('enter_phone');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);

  // feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [fbName, setFbName] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [fbError, setFbError] = useState<string|null>(null);
  const [fbSuccess, setFbSuccess] = useState(false);

    // ⚠️ Оставляю твои вспомогательные функции как были (верхнего уровня):
  const handleEmailSignIn = async () => {
    const email = prompt(t('auth.enter_email'));
    if (email) {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        alert(t('auth.email_error') + ': ' + error.message);
      } else {
        alert(t('auth.email_sent'));
      }
    }
  };

  const handleSmsSignIn = async () => {
    const phone = prompt(t('auth.enter_phone'))?.trim();
    if (!phone) { alert(t('auth.enter_phone')); return; }
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      alert(t('auth.sms_error') + ': ' + error.message);
    } else {
      setSmsSent(true);
      setSmsCode('');
    }
  };

  const verifySmsCode = async () => {
    const phone = prompt(t('auth.enter_phone_again'));
    const token = prompt(t('auth.enter_sms_code'));
    if (phone && token) {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) {
        alert(t('auth.code_error') + ': ' + error.message);
      } else {
        alert(t('auth.logged_in'));
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!fbMessage.trim()) { setFbError(t('feedback.message_required')); return; }
    setFbSending(true);
    setFbError(null);
    try {
      // ✅ Берём свежую сессию прямо сейчас (устраняет гонку на десктопе)
      const { data: { session: fresh }, error: sErr } = await supabase.auth.getSession();
      if (sErr) console.warn('getSession error:', sErr);
      const userId = fresh?.user?.id ?? session?.user?.id ?? null;

      const { error } = await supabase
        .from('feedback')
        .insert([{
          user_id: userId,
          name: fbName.trim() || null,
          email: fbEmail.trim() || null,
          message: fbMessage.trim(),
        }]);

      if (error) {
        console.error('feedback insert error:', error);
        throw error;
      }

      setFbSuccess(true);
      setFbName(''); setFbEmail(''); setFbMessage('');
      setTimeout(() => { setShowFeedbackModal(false); setFbSuccess(false); }, 2000);
    } catch (e: any) {
      setFbError(e.message || t('feedback.error'));
    } finally {
      setFbSending(false);
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const eventIdFromUrl = url.searchParams.get('event');

    console.log('[URL CHECK] eventIdFromUrl =', eventIdFromUrl); // 🐞 лог 1

    if (!eventIdFromUrl) return;

    const showEvent = async () => {
      console.log('[EVENT LINK] showEvent started'); // 🐞 лог 2

      let found = events.find(ev => String(ev.id) === eventIdFromUrl);
      console.log('[EVENT LINK] found in list:', found); // 🐞 лог 3

      if (!found) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventIdFromUrl)
          .maybeSingle();

        console.log('[EVENT LINK] fetched from supabase:', { data, error }); // 🐞 лог 4

        if (data) {
          const parsed = parseLatLng(data.lat, data.lng);
          const normType = normalizeType(data.type);
          found = {
            ...data,
            lat: parsed?.lat ?? null,
            lng: parsed?.lng ?? null,
            type: normType,
            types: normType,
          };

          setEvents(prev => (prev.some(ev => ev.id === found!.id) ? prev : [...prev, found!]));
          setFilteredEvents(prev => (prev.some(ev => ev.id === found!.id) ? prev : [...prev, found!]));
          loadedEventIds.current.add(String(found.id));
        }
      }

      if (found) {
        setSelectedEvent(found);

        if (found.lat && found.lng && mapRef.current) {
          mapRef.current.panTo({ lat: found.lat, lng: found.lng });
          if ((mapRef.current.getZoom() ?? 0) < 12) {
            mapRef.current.setZoom(12);
          }
        }

        scrollToEvent(found.id);

        url.searchParams.delete('event');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    };

    const interval = setInterval(() => {
      console.log('[EVENT LINK] checking events:', events.length); // 🐞 лог 5
      if (events.length > 0) {
        clearInterval(interval);
        showEvent();
      }
    }, 300);

    return () => clearInterval(interval);
  }, [events]);

  // эффекты
  // СТАЛО: ждём, когда Google Map загрузится
  // грузим события один раз при маунте — карта не нужна
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const interval = setInterval(() => {
      if (mapRef.current?.getBounds()) {
        fetchEventsInBounds();
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [mapReady, fetchEventsInBounds]);

  const shouldForceReloadRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (data?.user) {
        setSession({ user: data.user }); // упрощённо, если нужно
        setIsAuthenticated(true);

        const favs = await loadFavoritesFromProfile(data.user.id);
        setFavorites(favs);
      } else {
        setSession(null);
        setIsAuthenticated(false);
      }
    };
    init();
  }, []);

  // Подписка на изменение авторизации
  // 1. Слушаем изменения авторизации
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('📣 Auth state change:', event, newSession);

        // 1) актуальный user
        const user = newSession?.user ?? (await supabase.auth.getUser()).data.user ?? null;

        // 2) обновляем локальные флаги
        setIsAuthenticated(!!user);
        setSession(user ? { user } : null);

        // 3) если вошли/обновили токен/инициализировались — подтягиваем избранное и события
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (user) {
            try {
              const favs = await loadFavoritesFromProfile(user.id);
              setFavorites(favs);
            } catch (err) {
              console.error('Ошибка загрузки избранного из профиля:', err);
            }
          }

          // Полная перезагрузка списка: обнуляем и грузим форсированно,
          // дождавшись готовой карты и её границ
          resetEvents();
          shouldForceReloadRef.current = true;
        }

        // 4) если вышли — очищаем и тоже грузим события как для гостя
        if (event === 'SIGNED_OUT') {
          setFavorites([]);
          resetEvents();
          const b = await ensureBounds();
          await fetchEventsInBounds(b ?? undefined, { force: true });
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, [fetchEventsInBounds]);

  useEffect(() => {
    const ping = () => { supabase.auth.getUser().catch(() => {}); };
    const onVisible = () => document.visibilityState === 'visible' && ping();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', ping);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', ping);
    };
  }, []);

  // 2. Подписка на таблицу events — отдельный useEffect
  useEffect(() => {
    const channel = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          console.log('[Realtime] Обнаружено изменение — загружаем события...');
          fetchEventsInBounds();
        }
      )
      .subscribe();

    // 💡 Важно: очищаем канал синхронно
    return () => {
      supabase.removeChannel(channel); // НЕ await — иначе Next.js может выдать ошибку
    };
  }, [fetchEventsInBounds]);


  useEffect(() => () => { mapRef.current = null; }, []);

  useEffect(() => {
    document.body.classList.add('no-page-scroll');
    return () => document.body.classList.remove('no-page-scroll');
  }, []);

  useEffect(() => {
    try {
      const storedLang = localStorage.getItem('lang');
      if (storedLang) i18n.changeLanguage(storedLang);
      const storedViewed = localStorage.getItem('viewedEvents');
      if (storedViewed) setViewedEvents(JSON.parse(storedViewed));
      const storedFavorites = localStorage.getItem('favorites');
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
      } catch {
      }  
    }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        setVisibleCount(prev => prev + ITEMS_PER_LOAD);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [filteredEvents, showEventList]); // добавили showEventList

  // при открытии списка показывать все найденные события сразу
  useEffect(() => {
    if (showEventList) {
      setVisibleCount(filteredByView.length);
    }
  }, [showEventList, filteredByView.length]);

  useEffect(() => {
    applyFilters();
  }, [filterAge, filterFormat, filterType, dateRange, events]);

  useEffect(() => {
  // если события подгрузились и период ещё не выставлен полностью — ставим сегодня → +1 месяц
    if (
      events.length &&
      (!dateRange[0]?.startDate || !dateRange[0]?.endDate)
    ) {
      const today = new Date();
      const in1m = new Date();
      in1m.setMonth(today.getMonth() + 1);

      setDateRange([
        {
          startDate: today,
          endDate: in1m,
          key: 'selection',
        },
      ]);
    }
  }, [events]);

  // helpers
  const translateTypeLocal = (type: string) => {
    const key = typeTranslationKeys[type as keyof typeof typeTranslationKeys];
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }
    return type;
  };

  const saveUserToProfiles = async (user: any) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*').eq('id', user.id).single();
    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: user.id, email: user.email, phone: user.phone,
        name: user.user_metadata?.name || '',
        language: i18n.language, is_subscribed: false,
        created_at: new Date().toISOString()
      });
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');

      // локально чистим состояние
      setPhone(''); setSmsCode(''); setSmsSent(false);
      setSession(null); setIsAuthenticated(false);
      setShowAuthPrompt(false); setViewCount(0);
      setFavorites([]);

      // подстраховка: «пинганём» юзера — куки уже очищены
      await supabase.auth.getUser();
    } catch (e:any) {
      alert('Log out error: ' + (e?.message ?? 'unknown'));
    }
  };

  const handleResetFilters = () => {
    const today = new Date();
    const in1m = new Date(today);
    in1m.setMonth(in1m.getMonth() + 1);

    setDateRange([
      {
        startDate: today,
        endDate: in1m,
        key: 'selection',
      },
    ]);
    setFilterType([]);
    setFilterFormat([]);
    setFilterAge([]);
    setFilterPrice('');
    setFilteredEvents(events);
  };

  const markAsViewed = (id: string | number) => {
  const numId = Number(id);
    if (!viewedEvents.includes(numId)) {
      const updated = [...viewedEvents, numId];
      setViewedEvents(updated);
      localStorage.setItem('viewedEvents', JSON.stringify(updated));
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setShowAuthPrompt(true);
          return;
        }
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update favorites');
      }

      const j = await res.json();
      setFavorites(j.favorites || []);
    } catch (e) {
      console.error('[Favorites] toggle error:', e);
    }
  };

  // — аккуратно парсим координаты из БД (там могут быть строки)
  const parseLatLng = (lat: any, lng: any) => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    return Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null;
  };

  // — получаем координаты по адресу (если доступен Google Geocoder)
  const geocodeAddress = async (address?: string | null) => {
    const addr = (address || '').trim();
    if (!addr) return null;

    // 0) если карты ещё не загрузились — пропускаем
    if (!(window as any).google?.maps?.Geocoder) return null;

    // 2) Google
    const geocoder = new (window as any).google.maps.Geocoder();
    const res = await geocoder.geocode({ address: addr, region: 'CH', language: 'en' }).catch(() => null);
    const loc = res?.results?.[0]?.geometry?.location;

    if (loc && typeof loc.lat === 'function') {
      const coords = { lat: Number(loc.lat()), lng: Number(loc.lng()) };
      return coords;
    }
    return null;
  };

  useEffect(() => {
    if (mapStatus !== 'ready' || events.length === 0) return;

    (async () => {
      let changed = false;

      const updated = await Promise.all(
        events.map(async (ev) => {
          const hasCoords = Number.isFinite(Number(ev.lat)) && Number.isFinite(Number(ev.lng));
          if (hasCoords) return ev;

          // пробуем геокодить ТОЛЬКО если есть адрес
          if (ev.address) {
            const c = await geocodeAddress(ev.address);
            if (c) {
              changed = true;
              return { ...ev, lat: c.lat, lng: c.lng };
            }
          }
          return ev;
        })
      );

      if (changed) {
        setEvents(updated);
        // синхронно обновим и отфильтрованный список, чтобы пины не отваливались
        setFilteredEvents((prev) =>
          prev.map((e) => updated.find((u) => u.id === e.id) ?? e)
        );
      }
    })();
  }, [mapStatus, events]);

  const DateFilterTag = () => {
    if (!dateRange[0].startDate || !dateRange[0].endDate) return null;
    const formattedStart = formatDate(dateRange[0].startDate.toISOString());
    const formattedEnd = formatDate(dateRange[0].endDate.toISOString());
    return (
      <div className="flex items-center bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full">
        <span>{formattedStart} - {formattedEnd}</span>
        <button
          onClick={() => setDateRange([{ startDate: null, endDate: null, key: 'selection' }])}
          className="ml-2 text-gray-600 hover:text-gray-800"
        >✕</button>
      </div>
    );
  };

  // локальный хелпер для YYYY-MM-DD без сдвигов часового пояса
  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const applyFilters = () => {
    let filtered = [...events];

    const startStr = dateRange[0].startDate ? toYMD(dateRange[0].startDate as Date) : null;
    const endStr   = dateRange[0].endDate   ? toYMD(dateRange[0].endDate   as Date) : null;

    // Нормализуем даты события: пустой end_date заменяем на start_date
    const inRange = (ev: any) => {
      const evStart = (typeof ev.start_date === 'string') ? ev.start_date.slice(0, 10) : null;
      const evEnd   = (typeof ev.end_date === 'string' && ev.end_date)
        ? ev.end_date.slice(0, 10)
        : evStart;

      if (!evStart) return false; // у события вообще нет даты — скрываем

      if (startStr && endStr) {
        // пересечение [startStr, endStr] и [evStart, evEnd]
        return evStart <= endStr && (evEnd ?? evStart) >= startStr;
      }
      if (startStr) {
        return (evEnd ?? evStart) >= startStr;
      }
      if (endStr) {
        return evStart <= endStr;
      }
      return true;
    };

    filtered = filtered.filter(inRange);

    // остальные фильтры — без изменений
    if (filterAge.length) {
      filtered = filtered.filter((ev: EventRowWithAge) => {
        const val = ev.age_group;
        const eventAges: string[] =
          Array.isArray(val)
            ? (val as string[]).map((a) => (typeof a === 'string' ? a.trim() : ''))
            : typeof val === 'string'
            ? val.split(',').map((a) => a.trim())
            : [];
        return eventAges.some(age => filterAge.includes(age));
      });
    }
    if (filterFormat.length) filtered = filtered.filter(ev => filterFormat.includes(ev.format));
    if (filterType.length) {
      filtered = filtered.filter((ev) => {
        const arr: string[] = Array.isArray(ev.type) ? ev.type : [];
        // Оставляем событие, если ХОТЯ БЫ ОДИН его тип есть в выбранных
        return arr.some((t) => filterType.includes(t));
      });
    }
    if (filterPrice !== '')  filtered = filtered.filter(ev => Number(ev.price) <= Number(filterPrice));

    setFilteredEvents(filtered);
    setVisibleCount(ITEMS_PER_LOAD);
  };

  const handleCheckboxChange = (
    setFilter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setFilter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v: string) => v !== value) : [...prev, value]
    );
  };

  const DEFAULT_ICON = 'https://maps.google.com/mapfiles/ms/icons/ltblue-dot.png';
  const VALID_COLORS = new Set(['red','blue','green','yellow','purple','pink','orange','ltblue']);

  const getMarkerColor = (type?: string): string => {
    if (!type || typeof type !== 'string') return 'ltblue';
    const normalizedType = type.trim().toLowerCase();
    return markerColors[normalizedType] || 'ltblue';
  };

  const getMarkerIcon = (types?: string[]): string => {
    if (!types || !Array.isArray(types) || types.length === 0) return DEFAULT_ICON;

    // Берём первый тип из массива и ищем цвет
    const primaryType = types[0];
    const color = getMarkerColor(primaryType);
    const safe = VALID_COLORS.has(color as any) ? color : 'ltblue';

    return `https://maps.google.com/mapfiles/ms/icons/${safe}-dot.png`;
  };

  // 1) Словарь цветов
  const colorMap = {
    red:    '#decea4',
    blue:   '#8fb1fd',
    green:  '#eafaf1',
    purple: '#f3e8fd',
    orange: '#fff4e5',
    yellow: '#ffeeba',
    pink:   '#fde2e4',
    black:  '#111111',
    gray:   '#f5f5f5',
    lime:   '#e2fcd5',
    olive:  '#f3ffd3',
    magenta:'#ffd0f7',
    navy:   '#0e70fd',
    cyan:   '#e0f7fa',
  } as const;

  type ColorName = keyof typeof colorMap;

  // 2) ОДНА функция (типизирована)
  const getComputedColor = (colorName?: string): string => {
    if (!colorName) return '#999999';
    const normalized = colorName.trim().toLowerCase() as ColorName;
    return colorMap[normalized] ?? '#999999';
  };

  const formatDate = (d: string | Date): string => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // месяцы с 0
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const normalizeType = (raw: any): string[] =>
    Array.isArray(raw)
      ? raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
  : [];

  const formatTime = (timeStr?: string | null): string =>
  typeof timeStr === 'string' ? timeStr.slice(0, 5) : '';

  const getCurrentLocale = () => {
    const lang = i18n.language;
    const match = availableLanguages.find(l => l.code === lang);
    return match?.locale || ru;
  };

  const mapClickHandler = () => { setSelectedEvent(null); };

  const scrollToEvent = (eventId: EventId): void => {
    const index = filteredByView.findIndex((ev: ItemWithId) => ev.id === eventId);
    if (index === -1) return;
    if (index >= visibleCount) {
      setVisibleCount(index + 1);
      setTimeout(() => {
        const element = document.getElementById(`event-${eventId}`);
        if (element && listRef.current) {
          listRef.current.scrollTo({ top: element.offsetTop - 60, behavior: 'smooth' });
        }
      }, 50);
    } else {
      const element = document.getElementById(`event-${eventId}`);
      if (element && listRef.current) {
        listRef.current.scrollTo({ top: element.offsetTop - 60, behavior: 'smooth' });
      }
    }
  };

  const scrollIntoView = (eventId: EventId): void => {
    const el = document.getElementById(`event-${String(eventId)}`);
    if (el && listRef.current) {
      listRef.current.scrollTo({
        top: el.offsetTop - (listRef.current.offsetTop ?? 0) - 80,
        behavior: 'smooth',
      });
    }
  };

  const promoText = t('auth.promo');

  const handleSmsSend = async () => {
    setSmsError(null);
    if (!phone.trim()) { setSmsError(t('auth.phone_required')); return; }
    try {
      setSmsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
      if (error) throw error;
      setSmsStep('enter_code');
    } catch (e: any) {
      setSmsError(e.message || t('auth.sms_error'));
    } finally {
      setSmsLoading(false);
    }
  };

  const handleVerifySms = async () => {
    if (!phone || !smsCode) return;
    const { error } = await supabase.auth.verifyOtp({ phone, token: smsCode, type: 'sms' });
    if (error) {
      alert(t('auth.code_error') + ': ' + error.message);
    } else {
      setPhone(''); setSmsCode(''); setSmsSent(false);
      setShowAuthPrompt(false); setViewCount(0);
    }
  };

  const formatWebsite = (url?: string | null): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed.toLowerCase() === 'подробнее') return '';

    try {
      const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      const parsed = new URL(withProto);
      return parsed.toString();
    } catch {
      return '';
    }
  };

  // ====== SHARE + CALENDAR ======

  // склеиваем дату + время из полей БД в объект Date
  const toDate = (dateStr?: string | null, timeStr?: string | null) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (timeStr && /^\d{2}:\d{2}/.test(timeStr)) {
      const [hh, mm] = timeStr.split(':').map(Number);
      return new Date(y, (m || 1) - 1, d || 1, hh, mm);
    }
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // формат для ICS/Google (UTC для событий со временем, DATE для all-day)
  const fmtICS = (d: Date, allDay: boolean) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    if (allDay) {
      return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    }
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}` +
          `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  // экранирование текстов для ICS
  const escICS = (s: string = '') =>
    s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');

  // строим текст .ics
  const makeICS = (ev: any) => {
    const start = toDate(ev.start_date, ev.start_time) as Date;
    const endRaw = toDate(ev.end_date || ev.start_date, ev.end_time) as Date;
    const allDay = !ev.start_time && !ev.end_time;

    // для all-day в ICS DTEND не включителен — добавим +1 день
    const end = allDay ? new Date(endRaw.getTime() + 24*60*60*1000) : endRaw;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DFF Event Map//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      allDay ? `DTSTART;VALUE=DATE:${fmtICS(start, true)}` : `DTSTART:${fmtICS(start, false)}`,
      allDay ? `DTEND;VALUE=DATE:${fmtICS(end,   true)}` : `DTEND:${fmtICS(end,   false)}`,
      `UID:event-${ev.id}@dff-event-map`,
      `DTSTAMP:${fmtICS(new Date(), false)}`,
      `SUMMARY:${escICS(ev.title || 'Event')}`,
      ev.address ? `LOCATION:${escICS(ev.address)}` : '',
      ev.website ? `URL:${escICS(formatWebsite(ev.website))}` : '',
      `DESCRIPTION:${escICS(getDescription(ev))}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    return lines;
  };

  // скачать .ics
  const downloadICS = (icsText: string, filename = 'event.ics') => {
    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  };

  // ссылка в Google Calendar (веб)
  const makeGoogleCalendarUrl = (ev: any) => {
    const start = toDate(ev.start_date, ev.start_time) as Date;
    const endRaw = toDate(ev.end_date || ev.start_date, ev.end_time) as Date;
    const allDay = !ev.start_time && !ev.end_time;
    const end = allDay ? new Date(endRaw.getTime() + 24*60*60*1000) : endRaw;

    const s = fmtICS(start, allDay);
    const e = fmtICS(end,   allDay);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.title || 'Event',
      details: getDescription(ev) || '',
      location: ev.address || '',
      dates: `${s}/${e}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Web Share API + фолбэк в буфер обмена
  const shareEvent = async (ev: any) => {
    const siteUrl = `https://ch.the-event-map.com?event=${ev.id}`;
    const eventUrl = formatWebsite(ev.website) || window.location.href;
    const title = ev.title || 'Event';
    const description = getDescription(ev) || '';
    const address = ev.address || '';
    const start = formatDate(ev.start_date);
    const end = formatDate(ev.end_date);

    // если начало и конец одинаковы — показываем один раз
    const dateRange = start === end ? start : `${start} – ${end}`;

    const text = `${siteUrl}\n\n${title}\n${dateRange}\n${address}\n\n${description}`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title,
          text,
          url: eventUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${text}\n${eventUrl}`);
        alert(t('ui.copied') || 'Link copied');
      }
    } catch {
      // пользователь мог отменить — ничего не делаем
    }
  };

  const openEventById = useCallback(async (id: number) => {
    // 1) ищем в уже загруженных
    let ev = events.find(e => e.id === id);

    // 2) если нет — дотягиваем по id из Supabase
    if (!ev) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // если у тебя нет maybeSingle, используй .single() и ловим error

      if (!error && data) {
        const parsed = parseLatLng(data.lat, data.lng);
        const normType = normalizeType(data.type);
        ev = {
          ...data,
          lat: parsed?.lat ?? null,
          lng: parsed?.lng ?? null,
          type: normType,
          types: normType, // если где-то в коде ждут "types"
        };

        // добавим в списки, если ещё нет
        setEvents(prev => (prev.some(p => p.id === id) ? prev : [...prev, ev!]));
        setFilteredEvents(prev => (prev.some(p => p.id === id) ? prev : [...prev, ev!]));

        // если используешь loadedEventIds — пометим
        loadedEventIds?.current?.add?.(String(id));
      }
    }

    // 3) если нашли событие — центрируем карту и открываем инфо-окно
    if (ev) {
      if (ev.lat && ev.lng && mapRef.current) {
        mapRef.current.panTo({ lat: ev.lat, lng: ev.lng });
        // можно чуть приблизить, если сильно далеко
        const currentZoom = mapRef.current.getZoom() ?? 0;
        if (currentZoom < 12) mapRef.current.setZoom(12);
      }

      setSelectedEvent(ev);
      // если есть список — прокрутим к карточке
      scrollIntoView?.(ev.id);
    }

    // 4) очистим параметр из адресной строки (чтобы при F5 не всплывал снова)
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('event')) {
        url.searchParams.delete('event');
        const q = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (q ? `?${q}` : ''));
      }
    } catch {}
  }, [events]);

  type FavoriteId = string;

  const loadFavoritesFromProfile = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('favorites')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[favorites] load error:', error.message);
      return [];
    }

    // Supabase вернёт либо массив UUID, либо null
    return Array.isArray(data?.favorites) ? data!.favorites as string[] : [];
  };

  const saveFavoritesToProfile = async (userId: string, favs: string[]) => {
    const unique = Array.from(new Set(favs.map(String)));
    console.log('[SAVE]', unique);

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          favorites: unique, // ← напрямую массив, без join
        },
        { onConflict: 'id' }
      );

    if (error) throw error;
    return unique;
  };

  // очистка: оставить только те избранные, которые реально есть в events
  const pruneFavoritesAgainstEvents = async (favs: FavoriteId[]) => {
    if (!favs.length) return favs;
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .in('id', favs);
    if (error) {
      console.warn('[favorites] prune check error:', error.message);
      return favs; // не ломаем UX, просто вернем как есть
    }
    const exist = new Set((data ?? []).map((r: any) => Number(r.id)));
    return favs.filter(id => exist.has(Number(id)));
  };

  const navBtn =
    "px-4 py-2 rounded-full bg-white/95 hover:bg-white border border-gray-200 " +
    "shadow text-sm font-medium text-gray-800 backdrop-blur " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 active:translate-y-px";

    // === ВНУТРЕННИЕ КОМПОНЕНТЫ (используют состояния сверху) ===
  // Полная очистка localStorage с перезагрузкой

  const handleClearStorage = () => {
    try {
      localStorage.removeItem('map_center');
      localStorage.removeItem('map_zoom');
      localStorage.removeItem('saved_center');
      localStorage.removeItem('saved_zoom');
    } catch {}
    window.location.reload();
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  console.log('DATE RANGE:', dateRange);

  const [showProfile, setShowProfile] = useState(false);

  return (
    <ClientOnly>
      {isRefreshing && <RefreshSpinner />}
      {loadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 text-red-800 px-4 py-2 rounded shadow">
          {loadError}
        </div>
      )}
        <MapLayer
          mapStatus={mapStatus}
          mapReady={mapReady}
          setMapReady={setMapReady}
          isMobile={isMobile}
          mapRef={mapRef}
          events={events}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          setViewCount={setViewCount}
          isAuthenticated={isAuthenticated}
          setShowAuthPrompt={setShowAuthPrompt}
          markAsViewed={markAsViewed}
          scrollToEvent={scrollToEvent}
          toggleFavorite={toggleFavorite}
          getMarkerIcon={getMarkerIcon}
          formatDate={formatDate}
          getDescription={getDescription}
          formatWebsite={formatWebsite}
          makeICS={makeICS}
          downloadICS={downloadICS}
          makeGoogleCalendarUrl={makeGoogleCalendarUrl}
          shareEvent={shareEvent}
          fetchEventsInBounds={fetchEventsInBounds}
          openEventById={openEventById}
          center={center}
          showEventList={showEventList}
          visibleCount={visibleCount}
          filteredByView={filteredByView}
          favorites={favorites}
          loadedEventIds={loadedEventIds}
          resetEvents={resetEvents}
          setEvents={setEvents}
          setFilteredEvents={setFilteredEvents} 
          shouldForceReloadRef={shouldForceReloadRef}
        />

      {isMobile ? (
        <MobileOverlay
          i18n={i18n}
          t={t}
          mapRef={mapRef}
          showAuthPrompt={showAuthPrompt}
          setShowAuthPrompt={setShowAuthPrompt}
          availableLanguages={availableLanguages}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setShowFeedbackModal={setShowFeedbackModal}
          handleLanguageChange={handleLanguageChange}
          handleClearStorage={handleClearStorage}
          handleHomeClick={handleHomeClick}
          isAuthenticated={isAuthenticated}
          handleLogout={handleLogout}
          dateRange={dateRange}
          setDateRange={setDateRange}
          formatDate={formatDate}
          formatTime={formatTime}
          formatWebsite={formatWebsite}
          showEventList={showEventList}
          setShowEventList={setShowEventList}
          listRef={listRef ?? { current: null }}
          filteredByView={filteredByView}
          visibleCount={visibleCount}
          selectedEvent={selectedEvent?.toString() ?? null}
          setSelectedEvent={setSelectedEvent}
          getDescription={getDescription}
          shareEvent={shareEvent}
          downloadICS={downloadICS}
          makeICS={makeICS}
          makeGoogleCalendarUrl={makeGoogleCalendarUrl}
          favorites={favorites.map(String)}
          toggleFavorite={toggleFavorite}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
          markerColors={markerColors}
          filterType={filterType}
          setFilterType={setFilterType}
          translateTypeUI={translateTypeUI}
          filterFormat={filterFormat}
          setFilterFormat={setFilterFormat}
          filterAge={filterAge}
          setFilterAge={setFilterAge}
          handleResetFilters={handleResetFilters}
          handleNavigate={handleNavigate}
          showFavoritesList={showFavoritesList}
          setShowFavoritesList={setShowFavoritesList}
          userDisplay={userDisplay}
        />
      ) : (
        <DesktopOverlay 
          showAuthPrompt={showAuthPrompt}
          setShowAuthPrompt={setShowAuthPrompt}
          mapRef={mapRef}
          dateRange={dateRange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setDateRange={setDateRange}
          setShowFeedbackModal={setShowFeedbackModal}
          formatDate={formatDate}
          formatTime={formatTime}
          formatWebsite={formatWebsite}
          getDescription={getDescription}
          i18n={i18n}
          t={t}
          availableLanguages={availableLanguages}
          handleLanguageChange={handleLanguageChange}
          handleClearStorage={handleClearStorage}
          handleHomeClick={handleHomeClick}
          isAuthenticated={isAuthenticated}
          handleLogout={handleLogout}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          handleResetFilters={handleResetFilters}
          markerColors={markerColors}
          filterType={filterType}
          setFilterType={setFilterType}
          translateTypeUI={translateTypeUI}
          filterFormat={filterFormat}
          setFilterFormat={setFilterFormat}
          filterAge={filterAge}
          setFilterAge={setFilterAge}
          showEventList={showEventList}
          setShowEventList={setShowEventList}
          listRef={listRef ?? { current: null }}
          filteredByView={filteredByView}
          visibleCount={visibleCount}
          selectedEvent={selectedEvent?.toString() ?? null}
          setSelectedEvent={setSelectedEvent}
          shareEvent={shareEvent}
          downloadICS={downloadICS}
          makeICS={makeICS}
          makeGoogleCalendarUrl={makeGoogleCalendarUrl}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          showFavoritesList={showFavoritesList}
          setShowFavoritesList={setShowFavoritesList}
          userDisplay={userDisplay}
        />
      )}
      {showFavoritesList && (
        <>
          {/* 📱 Мобильный список */}
          {isMobile ? (
            <div
              className="fixed left-0 right-0 z-[1500] bg-white/95 p-4 shadow-2xl overflow-y-auto"
              style={{
                top: '120px', // высота верхней панели на мобилке
                bottom: 0,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">{t('ui.favorites')}</h2>
                <button
                  onClick={() => setShowFavoritesList(false)}
                  className="text-gray-600 hover:text-black text-xl font-bold"
                  aria-label="Close favorites list"
                >
                  ✕
                </button>
              </div>

              {events.filter(ev => favorites.includes(String(ev.id))).length === 0 ? (
                <p className="text-gray-500 text-sm text-center">{t('ui.noFavorites')}</p>
              ) : (
                events
                  .filter(ev => favorites.includes(String(ev.id)))
                  .map(ev => (
                    <div
                      key={ev.id}
                      className="mb-4 p-3 rounded-lg bg-white border border-gray-200 shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-gray-900 mb-1">{ev.title}</h3>
                          <p className="text-xs text-gray-800 mb-1">{getDescription(ev)}</p>
                          <p className="text-xs text-gray-600 mb-1">📍 {ev.address}</p>
                          <p className="text-xs text-gray-600">
                            🕒 {formatDate(ev.start_date)} – {formatDate(ev.end_date)} {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(String(ev.id))}
                          className="shrink-0 p-1 rounded hover:bg-gray-100"
                          aria-label="remove favorite"
                          title={t('ui.removeFavorite')}
                        >
                          <Heart className="w-5 h-5 text-pink-600" fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : (
            /* 🖥 Десктопный список */
            <div
              className="absolute top-0 bottom-0 right-0 w-[30vw] z-[3000] bg-white bg-opacity-95 overflow-y-auto p-4 shadow-2xl"
            >
              <h2 className="text-lg font-bold mb-4 flex justify-between items-center">
                {t('ui.favorites')}
                <button
                  onClick={() => setShowFavoritesList(false)}
                  className="text-gray-600 hover:text-black text-xl font-bold"
                  aria-label="Close favorites list"
                >
                  ✕
                </button>
              </h2>

              {events.filter(ev => favorites.includes(String(ev.id))).length === 0 ? (
                <p className="text-gray-500 text-center">{t('ui.noFavorites')}</p>
              ) : (
                events
                  .filter(ev => favorites.includes(String(ev.id)))
                  .map(ev => (
                    <div
                      key={ev.id}
                      className="mb-6 p-4 rounded-lg bg-white border border-gray-200 shadow transition-colors hover:bg-gray-50"
                    >
                      {/* Заголовок + сердечко */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{ev.title}</h3>
                        <button
                          onClick={() => toggleFavorite(String(ev.id))}
                          className="shrink-0 p-1 rounded hover:bg-gray-100"
                          aria-label="remove favorite"
                          title={t('ui.removeFavorite')}
                        >
                          <Heart className="w-5 h-5 text-pink-600" fill="currentColor" />
                        </button>
                      </div>

                      {/* Описание */}
                      <p className="text-sm text-gray-800 mb-1">{getDescription(ev)}</p>

                      {/* Адрес */}
                      {ev.address && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          {ev.address}
                          <button
                            onClick={() => navigator.clipboard.writeText(ev.address)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title={t('ui.copyAddress')}
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                        </p>
                      )}

                      {/* Даты */}
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        {formatDate(ev.start_date)} – {formatDate(ev.end_date)} {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                      </p>

                      {/* Сайт */}
                      {ev.website && (
                        <a
                          href={ev.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 underline break-words flex items-center gap-1"
                        >
                          <LinkIcon className="w-4 h-4 text-blue-600" />
                          {formatWebsite(ev.website)}
                        </a>
                      )}

                      {/* Кнопки действий с иконками */}
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => shareEvent(ev)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={t('ui.share')}
                        >
                          <Share2 className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => downloadICS(makeICS(ev), `${(ev.title || 'event').replace(/[^\w\-]+/g,'_')}.ics`)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={t('ui.addToCalendar')}
                        >
                          <CalendarPlus className="w-5 h-5 text-gray-600" />
                        </button>
                        <a
                          href={makeGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Google Calendar"
                        >
                          <CalendarDays className="w-5 h-5 text-gray-600" />
                        </a>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </>
      )}

      {/* ОБЩИЕ МОДАЛКИ */}
      {showTranslation && (
        <div className="fixed top-0 right-0 m-4 z-50 max-w-sm w-full">
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold text-gray-800">{t('Translated description')}</h2>
              <button className="text-gray-500 hover:text-gray-700 text-sm" onClick={() => setShowTranslation(false)}>✕</button>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-line">{translatedText}</p>
          </div>
        </div>
      )}

      <AuthDialog
        show={showAuthPrompt}
        onClose={() => {
          setShowAuthPrompt(false);
          setViewCount(0); // обнуляем счётчик, как раньше
        }}
        setViewCount={setViewCount}
      />
      <FeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
      {showHomeModal && (
        <HomeLocationModal
          onClose={() => setShowHomeModal(false)}
          onSaved={() => alert('Домашнее местоположение сохранено!')}
          mapRef={mapRef}
        />
      )}
    </ClientOnly>
  );
}
