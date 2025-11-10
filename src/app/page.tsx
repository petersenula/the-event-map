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
import WelcomeDialog from '@/components/WelcomeDialog';
import WelcomeIntroDialog from '@/components/WelcomeIntroDialog';
import FilterIntroDialog from '@/components/FilterIntroDialog';
import { typeTranslationKeys } from '@/lib/typeTranslationKeys';
import {
  idbGetEventsInBounds,
  idbPutEvents,
  idbGetEventById,
  idbDeleteEvent,
  idbClearAll,
  idbIsTileStale,
  idbMarkTileFetched,
  makeViewportKey,
  normalizeEvent,
  idbGetAllEvents,
  idbGetAllIds,
  idbBulkDelete,
  idbMetaGet,
  idbMetaSet,
} from '@/lib/idb';

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
      <span>Updating...</span>
    </div>
  );
}

export default function EventMap() {
  const [mapReady, setMapReady] = useState(false);
  const isMobile = useIsMobile(768);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [showFavoritesList, setShowFavoritesList] = useState(false);

  const eventClickCount = useRef(0);
  const handleEventViewed = (ev: any) => {
    eventClickCount.current += 1;
    if (eventClickCount.current === 2) {
      setShowFilterIntro(true);
    }
  };

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
      if (key.startsWith('sb-') && !key.startsWith('supabase.')) continue; // ⚠️ НЕ трогаем supabase-сессию
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

  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (!session?.user) return;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    })();
  }, [session]);

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

  const [loadedCount, setLoadedCount] = useState<number>(0);

  useEffect(() => {
    // Check&Apply update на холодном старте
    (async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        await reg.update().catch(() => {});
        if (reg.waiting) {
          // есть новая версия — применяем и перезагружаем
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // дождёмся, когда новый SW возьмёт управление, и перезагрузимся
          const onCc = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onCc);
            window.location.reload();
          };
          navigator.serviceWorker.addEventListener('controllerchange', onCc, { once: true });
        }
      } catch {}
    })();
  }, []);

  const syncEventsWithServer = useCallback(
    async (
      reason: 'hourly' | 'login' | 'logout' | 'startup' | 'manual' = 'manual'
    ) => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        console.warn(`[SYNC] Пропущен sync — нет сессии (${reason})`);
        return;
      }
      try {
        console.log('[SYNC] start, reason =', reason);

        // ---------- 1) Тянем ВСЕ id постранично ----------
        const pageSize = 1000;
        const serverIds = new Set<string>();
        let page = 0;

        for (;;) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          console.log(`[SYNC-IDS] requesting page ${page}, range ${from}-${to}`);

          const { data, error } = await supabase
            .from('events')
            .select('id')
            .order('id', { ascending: true })
            .range(from, to);

          if (error) {
            console.error('[SYNC-IDS] error:', error);
            break;
          }

          const rows = data ?? [];
          for (const row of rows) serverIds.add(String(row.id));
          console.log(
            `[SYNC-IDS] got ${rows.length} ids on page ${page} (total collected: ${serverIds.size})`
          );

          if (rows.length < pageSize) {
            console.log('[SYNC-IDS] reached last page');
            break; // <= ВАЖНО: теперь break только при последней странице
          }
          page++;
        }

        // ---------- 2) Локальные id из IDB ----------
        const localIds = await idbGetAllIds();
        console.log(
          `[SYNC] localIds=${localIds.size}, serverIds=${serverIds.size}`
        );

        // ---------- 3) Разница ----------
        const idsToAdd: string[] = [];
        const idsToRemove: string[] = [];
        for (const sid of serverIds) if (!localIds.has(sid)) idsToAdd.push(sid);
        for (const lid of localIds) if (!serverIds.has(lid)) idsToRemove.push(lid);
        console.log(`[SYNC] toAdd=${idsToAdd.length}, toRemove=${idsToRemove.length}`);

        // ---------- 4) Тянем ПОЛНЫЕ данные постранично и пишем в IDB ----------
        page = 0;
        const toState: any[] = [];

        for (;;) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          console.log(`[SYNC-FULL] requesting page ${page}, range ${from}-${to}`);

          const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('id', { ascending: true })
            .range(from, to);

          if (error) {
            console.error('[SYNC-FULL] error:', error);
            break;
          }

          const rows = data ?? [];
          console.log(`[SYNC-FULL] got ${rows.length} rows on page ${page}`);
          if (rows.length === 0) {
            console.log('[SYNC-FULL] reached empty page, stopping');
            break;
          }

          const batch = rows.map(normalizeEvent);

          // -> в IDB
          try {
            await idbPutEvents(batch);
          } catch (e) {
            console.warn('[SYNC-FULL] idbPutEvents error:', e);
          }

          // -> в память (UI), без дублей
          const fresh = batch.filter(
            (ev) => !loadedEventIds.current.has(String(ev.id))
          );
          if (fresh.length) {
            toState.push(...fresh);
            for (const ev of fresh) loadedEventIds.current.add(String(ev.id));
          }

          if (rows.length < pageSize) {
            console.log('[SYNC-FULL] last page reached');
            break;
          }
          page++;
        }

        if (toState.length) {
          setEvents((prev) => [...prev, ...toState]);
          setFilteredEvents((prev) => [...prev, ...toState]);
        }

        // ---------- 5) Удаляем лишние локальные ----------
        if (idsToRemove.length) {
          try {
            await idbBulkDelete(idsToRemove);
          } catch (e) {
            console.warn('[SYNC] idbBulkDelete error:', e);
          }
          const removeSet = new Set(idsToRemove);
          setEvents((prev) => prev.filter((p) => !removeSet.has(String(p.id))));
          setFilteredEvents((prev) =>
            prev.filter((p) => !removeSet.has(String(p.id)))
          );
          for (const id of idsToRemove) loadedEventIds.current.delete(String(id));
        }

        console.log('[SYNC] done');
      } catch (e) {
        console.error('[SYNC] failed:', e);
      }
    },
    [setEvents, setFilteredEvents]
  );

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        console.log('[SYNC] Есть сессия — запускаем синхронизацию');
        await syncEventsWithServer('startup');
      } else {
        console.log('[SYNC] Нет сессии — пропускаем sync');
      }
    };

    init();

    const iv = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await syncEventsWithServer('hourly');
      } else {
        console.log('[SYNC] Пропущен hourly sync — нет сессии');
      }
    }, 60 * 60 * 1000); // раз в час

    return () => clearInterval(iv);
  }, [syncEventsWithServer]);

  const bootedAllOnceRef = useRef(false);

  useEffect(() => {
    if (bootedAllOnceRef.current) return;
    bootedAllOnceRef.current = true;

    (async () => {
      console.log('[BOOT] 🔁 Запуск первой загрузки');

      try {
        const all = await idbGetAllEvents();
        console.log(`[BOOT] 📦 Получено из IDB: ${all.length} событий`);

        const fresh = all.filter(ev => !loadedEventIds.current.has(String(ev.id)));
        if (fresh.length) {
          console.log(`[BOOT] ✅ Добавлено в память: ${fresh.length} новых`);
          setEvents(prev => [...prev, ...fresh]);
          setFilteredEvents(prev => [...prev, ...fresh]);
          fresh.forEach(ev => loadedEventIds.current.add(String(ev.id)));
        }

        if (all.length < 1000) {
          console.log('[BOOT] ⚠️ Слишком мало событий — загружаем всё из Supabase');

          const pageSize = 1000;
          let page = 0;
          const toState: any[] = [];

          for (;;) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            console.log(`[BOOT] 🌐 Запрос Supabase: страница ${page} (${from}-${to})`);

            const { data, error } = await supabase
              .from('events')
              .select('*')
              .order('id', { ascending: true })
              .range(from, to);

            if (error) {
              console.error('[BOOT] ❌ Ошибка запроса Supabase:', error);
              break;
            }

            const batch = (data ?? []).map(normalizeEvent);
            if (!batch.length) break;

            toState.push(...batch.filter(ev => !loadedEventIds.current.has(String(ev.id))));
            try {
              await idbPutEvents(batch);
              console.log(`[BOOT] 💾 Сохранено в IDB: ${batch.length}`);
            } catch (e) {
              console.warn('[BOOT] ⚠️ Ошибка записи в IDB:', e);
            }

            if (batch.length < pageSize) break;
            page++;
          }

          if (toState.length) {
            console.log(`[BOOT] ✅ Добавлено в память из Supabase: ${toState.length}`);
            setEvents(prev => [...prev, ...toState]);
            setFilteredEvents(prev => [...prev, ...toState]);
            toState.forEach(ev => loadedEventIds.current.add(String(ev.id)));
          }
        } else {
          console.log('[BOOT] ✅ В IDB уже достаточно событий, Supabase не нужен');
        }
      } catch (e) {
        console.warn('[BOOT] ❌ Ошибка в bootedAllOnce:', e);
      }
    })();
  }, []);

  const fetchEventsInBounds = useCallback(
    async (maybeBounds?: google.maps.LatLngBounds | null) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const bounds = maybeBounds ?? (await ensureBounds());
        if (!bounds) return;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const minLat = sw.lat(), maxLat = ne.lat();
        const minLng = sw.lng(), maxLng = ne.lng();

        // 👉 Только IndexedDB (никакой сети)
        const cached = await idbGetEventsInBounds({ minLat, maxLat, minLng, maxLng });

        if (cached?.length) {
          const fresh = cached.filter(ev => !loadedEventIds.current.has(String(ev.id)));
          if (fresh.length) {
            setEvents(prev => [...prev, ...fresh]);
            setFilteredEvents(prev => [...prev, ...fresh]);
            for (const ev of fresh) loadedEventIds.current.add(String(ev.id));
          }
        }

        // опционально — посчитаем общий total (по сети это не делаем)
        // await fetchTotalCountForCurrentFilters(); // можно закомментировать, если мешает
      } catch (e) {
        console.error('fetchEventsInBounds failed (IDB-only):', e);
      } finally {
        fetchingRef.current = false;
      }
    },
    [ensureBounds, setEvents, setFilteredEvents]
  );

  const userId = session?.user?.id ?? null;

  // чтобы не гонялось дважды из-за StrictMode
  const didRunLoginRef = useRef(false);

  useEffect(() => {
    if (!userId) return;           // нет пользователя — этот эффект не выполняем
    if (didRunLoginRef.current) {  // простая защита от дубля при StrictMode
      didRunLoginRef.current = false; 
    }
    didRunLoginRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // 1) Избранное
        try {
          const favs = await loadFavoritesFromProfile(userId);
          if (!cancelled) setFavorites(favs);
        } catch (err) {
          console.error('Ошибка загрузки избранного из профиля:', err);
        }

        // 2) Праймим локальный кэш, если пуст
        const localIds = await idbGetAllIds();
        if (!localIds || localIds.size === 0) {
          const pageSize = 1000;
          let page = 0;
          const toState: any[] = [];

          for (;;) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
              .from('events')
              .select('*')
              .order('id', { ascending: true })
              .range(from, to);

            if (error) {
              console.error('[auth-load-all] supabase error:', error);
              break;
            }

            const batch = (data ?? []).map(normalizeEvent);
            if (!batch.length) break;

            toState.push(...batch.filter(ev => !loadedEventIds.current.has(String(ev.id))));
            try { await idbPutEvents(batch); } catch {}

            if (batch.length < pageSize) break;
            page++;
          }

          if (!cancelled && toState.length) {
            setEvents(prev => [...prev, ...toState]);
            setFilteredEvents(prev => [...prev, ...toState]);
            toState.forEach(ev => loadedEventIds.current.add(String(ev.id)));
          }
        } else {
          // 3) Синхронизация после логина
          await syncEventsWithServer('login');
        }
      } finally {
        // no-op
      }
    })();

    return () => { cancelled = true; };
  }, [userId]); // ← реагируем именно на появление/смену userId

  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    // интересен переход "был пользователь → стал null"
    if (prev && !userId) {
      // Если у тебя есть флаг ручного выхода – можно учесть:
      if (manualLogoutRef.current) {
        manualLogoutRef.current = false;

        setShowAuthPrompt(false);
        setViewCount(0);
        setFavorites([]);

        // Данные в IndexedDB НЕ трогаем: карта остаётся с событиями
        if (mapRef.current?.getBounds()) {
          fetchEventsInBounds(mapRef.current.getBounds()!);
        }
      }

      // Лёгкая синхронизация после выхода (если нужно)
      (async () => {
        try { await syncEventsWithServer('logout'); } catch {}
      })();
    }
  }, [userId, fetchEventsInBounds]);

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
    setIsAuthenticated(!!session?.user);
  }, [session?.user]);

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

  const [viewCount, setViewCount] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
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

      // Добавляем 1 день к дате окончания периода (включительно)
      const rangeEnd = new Date(range.endDate);
      rangeEnd.setDate(rangeEnd.getDate() + 1);

      if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return false;

      return eventEnd >= range.startDate && eventStart < rangeEnd;
    }

    const query = searchQuery.toLowerCase().trim();

    const result = events.filter((ev) => {
      // === Поиск ===
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

      // === Тип ===
      const eventTypes = Array.isArray(ev.types)
        ? ev.types
        : ev.types
        ? [ev.types]
        : [];
      const matchesType =
        !filterType.length || eventTypes.some((type) => filterType.includes(type));

      // === Формат (учёт any) ===
      const eventFormats = Array.isArray(ev.format)
        ? ev.format
        : ev.format
        ? [ev.format]
        : [];

      const expandedFormatFilter = filterFormat.includes('children')
        ? ['children', 'any']
        : filterFormat.includes('adults')
        ? ['adults', 'any']
        : filterFormat;

      const matchesFormat =
        !filterFormat.length ||
        eventFormats.some((format) => expandedFormatFilter.includes(format));

      // === Возраст ===
      const eventAges = Array.isArray(ev.age_group)
        ? ev.age_group
        : ev.age_group
        ? [ev.age_group]
        : [];
      const matchesAge =
        !filterAge.length || eventAges.some((age) => filterAge.includes(age));

      // === Дата ===
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
        setSelectedEvent(found.id);

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

  useEffect(() => {
    // Показываем приветствие только один раз и только неавторизованным
    try {
      const seen = localStorage.getItem('welcome_seen_v1');
      if (!seen && mapReady && !isAuthenticated) {
        // небольшая пауза, чтобы карта успела подгрузиться
        const t = setTimeout(() => setShowWelcome(true), 500);
        return () => clearTimeout(t);
      }
    } catch (e) {
      console.warn('Ошибка при проверке welcome_seen_v1', e);
    }
  }, [mapReady, isAuthenticated]);

  const handleWelcomeLangChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

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

  const [showWelcome, setShowWelcome] = useState(false);
  const [showFilterIntro, setShowFilterIntro] = useState(false);
  const [filterIntroAge, setFilterIntroAge] = useState<string[]>([]);
  const [filterIntroType, setFilterIntroType] = useState<string[]>([]);
  const [eventOpenCount, setEventOpenCount] = useState(0);

  // 5.1 Периодический refresh токена каждые 5 минут
  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          // сессии нет — пробуем тихо обновить
          await supabase.auth.refreshSession();
        }
      } catch {
        // ignore
      }
    };

    // первый раз — через 30 секунд после старта, дальше каждые 5 минут
    const t1 = setTimeout(() => { if (!stopped) tick(); }, 30_000);
    const iv = setInterval(() => { if (!stopped) tick(); }, 5 * 60_000);

    return () => {
      stopped = true;
      clearTimeout(t1);
      clearInterval(iv);
    };
  }, []);

  // 5.2 При возвращении во вкладку — мгновенно пытаемся оживить сессию,
  // и тихо подливаем события если тайл протух
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          await supabase.auth.refreshSession().catch(() => {});
        }
      } catch {}

      // ждём реальные bounds, а не null
      const b = await ensureBounds();
      if (b) {
        await fetchEventsInBounds(b);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchEventsInBounds, ensureBounds]);

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          // нет сессии — тихо пробуем оживить
          await supabase.auth.refreshSession().catch(() => {});
        }
      } catch {}
    };

    // первый тик — через 30с после старта, дальше каждые 5 минут
    const t1 = setTimeout(() => { if (!stopped) tick(); }, 30_000);
    const iv = setInterval(() => { if (!stopped) tick(); }, 5 * 60_000);

    // если внезапно появился интернет — сразу тик
    const onOnline = () => tick();
    window.addEventListener('online', onOnline);

    return () => {
      stopped = true;
      clearTimeout(t1);
      clearInterval(iv);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth init] error:', error);
        return;
      }
      const session = data.session;
      const user = session?.user ?? null;

      setIsAuthenticated(!!user);
      setSession(user ? { user } : null);

      if (user) {
        try {
          const favs = await loadFavoritesFromProfile(user.id);
          setFavorites(favs);
        } catch (err) {
          console.error('Ошибка загрузки избранного:', err);
        }
      }
    };

    initAuth();
  }, []);

  const [totalCount, setTotalCount] = useState<number | null>(null);

  async function fetchTotalEventsCount(): Promise<void> {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true }); // head=true → только счётчик, без данных

    if (error) {
      console.error('[TotalEventsCount] error:', error);
      setTotalCount(null);
      return;
    }

    setTotalCount(count ?? 0);
  }

  useEffect(() => {
    fetchTotalEventsCount();
  }, []);

  // 2. Подписка на таблицу events — отдельный useEffect
  useEffect(() => {
    const channel = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        async (payload: any) => {
          try {
            const type = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            if (type === 'INSERT' || type === 'UPDATE') {
              const ev = normalizeEvent(payload.new);
              // 1) кэш
              try { await idbPutEvents([ev]); } catch {}
              // 2) память (если он уже показан — обновим; если нет — оставим кэш обновлённым)
              setEvents(prev => {
                const i = prev.findIndex(p => p.id === ev.id);
                if (i === -1) return prev;
                const next = prev.slice(); next[i] = { ...prev[i], ...ev }; return next;
              });
              setFilteredEvents(prev => {
                const i = prev.findIndex(p => p.id === ev.id);
                if (i === -1) return prev;
                const next = prev.slice(); next[i] = { ...prev[i], ...ev }; return next;
              });
            }
            if (type === 'DELETE') {
              const id = payload.old?.id;
              if (id != null) {
                try { await idbDeleteEvent(id); } catch {}
                setEvents(prev => prev.filter(p => p.id !== id));
                setFilteredEvents(prev => prev.filter(p => p.id !== id));
                loadedEventIds.current.delete(String(id));
              }
            }
          } catch (e) {
            console.warn('[Realtime] handler error:', e);
          }
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

  const manualLogoutRef = useRef(false);

  const handleLogout = async () => {
    try {
      manualLogoutRef.current = true;
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
    if (filterFormat.length) {
      filtered = filtered.filter((ev) => {
        const formats = Array.isArray(ev.format)
          ? ev.format.map((f) => (typeof f === 'string' ? f.trim() : ''))
          : typeof ev.format === 'string'
          ? ev.format.split(',').map((f) => f.trim())
          : [];

        // Проверяем, пересекаются ли массивы
        return formats.some((f) => filterFormat.includes(f));
      });
    }
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
    const siteUrl = `https://the-event-map.com`;
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
    // 1) в памяти?
    let ev: any = events.find(e => e.id === id);

    // 2) в IndexedDB?
    if (!ev) {
      ev = await idbGetEventById(id);
    }

    // 3) в Supabase (и сразу в кэш)
    if (!ev) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        ev = normalizeEvent(data);
        // в память
        setEvents(prev => (prev.some(p => p.id === id) ? prev : [...prev, ev!]));
        setFilteredEvents(prev => (prev.some(p => p.id === id) ? prev : [...prev, ev!]));
        loadedEventIds?.current?.add?.(String(id));
        // в кэш
        try { await idbPutEvents([ev]); } catch {}
      }
    }

    // если нашли — центрируем карту и открываем окно
    if (ev) {
      if (ev.lat && ev.lng && mapRef.current) {
        mapRef.current.panTo({ lat: ev.lat, lng: ev.lng });
        const currentZoom = mapRef.current.getZoom() ?? 0;
        if (currentZoom < 12) mapRef.current.setZoom(12);
      }
      setSelectedEvent(ev.id);
      scrollIntoView?.(ev.id);
    }

    // чистим URL
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

  const navBtn =
    "px-4 py-2 rounded-full bg-white/95 hover:bg-white border border-gray-200 " +
    "shadow text-sm font-medium text-gray-800 backdrop-blur " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 active:translate-y-px";

    // === ВНУТРЕННИЕ КОМПОНЕНТЫ (используют состояния сверху) ===
  // Полная очистка localStorage с перезагрузкой

  const handleClearStorage = async () => {
    try {
      // 1) Проверяем интернет
      if (!navigator.onLine) {
        alert(t('reload.partial')); 
        return;
      }

      // 2) Проверяем сессию
      const { data } = await supabase.auth.getSession();

      if (!data?.session) {
        await supabase.auth.refreshSession().catch(() => {});
        const ok = await waitForSessionRestore(5000);
        if (!ok) {
          alert(t('reload.partial')); 
          return;
        }
      }

      // 3) Полный перезапуск (как будто приложение закрыли и открыли)
      window.location.reload();

    } catch (e) {
      console.warn('[Reload] error:', e);
    }
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
          ensureBounds={ensureBounds}
          onEventViewed={handleEventViewed}
        />

      {!showWelcome && (
        isMobile ? (
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
            loadedCount={events.length}
            totalCount={totalCount}
            isAuthenticated={!!session?.user}
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
            loadedCount={events.length}
            totalCount={totalCount}
            isAuthenticated={!!session?.user}
          />
        )
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

                        {/* адрес + копировать */}
                        {ev.address && (
                          <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <span className="flex-1">{ev.address}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(ev.address)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title={t('ui.copyAddress')}
                              aria-label={t('ui.copyAddress')}
                            >
                              <Copy className="w-4 h-4 text-gray-500" />
                            </button>
                          </p>
                        )}

                        {/* даты */}
                        <p className="text-xs text-gray-600">
                          🕒 {formatDate(ev.start_date)} – {formatDate(ev.end_date)} {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                        </p>
                      </div>

                      {/* снять из избранного */}
                      <button
                        onClick={() => toggleFavorite(String(ev.id))}
                        className="shrink-0 p-1 rounded hover:bg-gray-100"
                        aria-label="remove favorite"
                        title={t('ui.removeFavorite')}
                      >
                        <Heart className="w-5 h-5 text-pink-600" fill="currentColor" />
                      </button>
                    </div>

                    {/* действия: поделиться / ICS / Google Calendar */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => shareEvent(ev)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300"
                        title={t('ui.share')}
                        aria-label={t('ui.share')}
                      >
                        <Share2 className="w-5 h-5 text-gray-600" />
                      </button>

                      <button
                        onClick={() => downloadICS(makeICS(ev), `${(ev.title || 'event').replace(/[^\w\-]+/g,'_')}.ics`)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300"
                        title={t('ui.addToCalendar')}
                        aria-label={t('ui.addToCalendar')}
                      >
                        <CalendarPlus className="w-5 h-5 text-gray-600" />
                      </button>

                      <a
                        href={makeGoogleCalendarUrl(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300"
                        title="Google Calendar"
                        aria-label="Google Calendar"
                      >
                        <CalendarDays className="w-5 h-5 text-gray-600" />
                      </a>
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

      <WelcomeIntroDialog
        show={showWelcome}
        onClose={() => {
          setShowWelcome(false);
          try { localStorage.setItem('welcome_seen_v1', '1'); } catch {}
        }}
        availableLanguages={availableLanguages.map(({ code, label }) => ({ code, label }))}
        currentLang={(i18n.language?.split?.('-')[0] ?? 'en')}
        onChangeLanguage={handleWelcomeLangChange}
      />

      <FeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {showHomeModal && (
        <HomeLocationModal
          onClose={() => setShowHomeModal(false)}
          onSaved={() => alert(t('home_saved'))}
          mapRef={mapRef}
        />        

      )}
    </ClientOnly>
  );
}
