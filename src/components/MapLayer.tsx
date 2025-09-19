'use client'

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import MemoizedMap from './MemoizedMap';
import { supabase } from '@/utils/supabase/client';

interface MapLayerProps {
  setMapReady: (ready: boolean) => void; 
  mapStatus: string;
  isMobile: boolean;
  mapReady: boolean;
  events: any[];
  selectedEvent: string | number | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<string | number | null>>;
  setViewCount: React.Dispatch<React.SetStateAction<number>>;
  isAuthenticated: boolean;
  setShowAuthPrompt: (b: boolean) => void;
  markAsViewed: (id: string | number) => void;
  scrollToEvent: (id: string | number) => void;
  toggleFavorite: (id: string) => void | Promise<void>;
  mapRef: React.RefObject<google.maps.Map | null>;
  getMarkerIcon: (types?: string[]) => string;
  formatDate: (d: string) => string;
  getDescription: (ev: any) => string;
  formatWebsite: (w: string) => string;
  makeICS: (ev: any) => string;
  downloadICS: (ics: string, filename: string) => void;
  makeGoogleCalendarUrl: (ev: any) => string;
  shareEvent: (ev: any) => void;
  fetchEventsInBounds: (bounds?: google.maps.LatLngBounds | null) => void | Promise<void>;
  openEventById: (id: number) => void;
  center: { lat: number; lng: number };
  showEventList: boolean;
  visibleCount: number;
  filteredByView: any[];
  favorites: string[]; 
  loadedEventIds: React.MutableRefObject<Set<string | number>>;
  resetEvents: () => void;
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
  setFilteredEvents: React.Dispatch<React.SetStateAction<any[]>>;
}

const MapLayer: React.FC<MapLayerProps> = ({
  mapReady,
  favorites,
  setMapReady,
  mapStatus,
  isMobile,
  events,
  selectedEvent,
  setSelectedEvent,
  setViewCount,
  isAuthenticated,
  setShowAuthPrompt,
  markAsViewed,
  scrollToEvent,
  toggleFavorite,
  mapRef,
  getMarkerIcon,
  formatDate,
  getDescription,
  formatWebsite,
  makeICS,
  downloadICS,
  makeGoogleCalendarUrl,
  shareEvent,
  fetchEventsInBounds,
  openEventById,
  center,
  showEventList,
  visibleCount,
  filteredByView,
  loadedEventIds,
  resetEvents,
  setEvents,
  setFilteredEvents,
}) => {console.log('[MapLayer] mapRef:', mapRef);
    const selected = selectedEvent
        ? events.find((ev) => ev.id === selectedEvent) ?? null
        : null;

    const mapContainerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
    const mapOptions = useMemo<google.maps.MapOptions>(
        () => ({
        zoomControl: true,
        streetViewControl: !isMobile,
        mapTypeControl: !isMobile,
        fullscreenControl: !isMobile,
        gestureHandling: 'greedy',
        clickableIcons: false,
        }),
        [isMobile]
    );

    const mapCenterRef = useRef(center);
    const initialEventIdRef = useRef<number | null>(null);

    useEffect(() => {
        try {
        const p = new URL(window.location.href).searchParams.get('event');
        initialEventIdRef.current = p && !isNaN(Number(p)) ? Number(p) : null;
        } catch {}
    }, []);

    useEffect(() => {
        // ждём готовности карты, иначе эффект может сработать раньше onLoad
        if (!mapReady || !mapRef.current) return;

        const checkAndSetHomeLocation = async () => {
            try {
            // ⚠️ если только что восстановились — пропускаем "дом" ОДИН РАЗ
            if (localStorage.getItem('skip_home_once') === 'true') {
                console.log('[HOME LOCATION] skipped once due to restore');
                localStorage.removeItem('skip_home_once'); // одноразово
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('home_location')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn('[HOME LOCATION] error:', error.message);
                return;
            }

            if (profileData?.home_location && mapRef.current) {
                const { lat, lng } = profileData.home_location;
                mapRef.current.panTo({ lat, lng }); // плавно
                mapRef.current.setZoom(12);

                localStorage.setItem('saved_center', JSON.stringify({ lat, lng }));
                localStorage.setItem('saved_zoom', '12');
                console.log('[HOME LOCATION] applied from profile');
            }
            } catch (err) {
            console.error('[HOME LOCATION] exception:', err);
            }
        };

        checkAndSetHomeLocation();
    }, [mapReady, mapRef]);


    useEffect(() => {
    if (!mapReady) {
        console.log('[useEffect] карта ещё не готова');
        return;
    }
    console.log('[useEffect] карта готова, но ждём handleMapLoad для загрузки событий');
    }, [mapReady]);

    useEffect(() => {
        if (showEventList && selectedEvent != null) {
        scrollToEvent(selectedEvent);
        }
    }, [showEventList, selectedEvent, filteredByView, visibleCount]);

    useEffect(() => {
        if (!mapRef?.current) {
            console.warn('mapRef.current is undefined');
            return;
        }
        if (!mapRef.current) return;
        mapRef.current.setOptions({
        streetViewControl: !isMobile,
        mapTypeControl: !isMobile,
        fullscreenControl: !isMobile,
        });
    }, [isMobile]);

   const initializedRef = useRef(false);

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        console.log('[onLoad] map initializing...');
        mapRef.current = map;

        // ⚠️ Dev-режим с React.StrictMode монтирует 2 раза.
        if (initializedRef.current) {
            console.log('[onLoad] already initialized (StrictMode duplicate), skipping init');
            return;
        }
        initializedRef.current = true;

        // --- восстановление центра/зума ---
        const pendingId = initialEventIdRef.current;

        if (pendingId) {
            (window as any).google.maps.event.addListenerOnce(map, 'idle', () => {
                openEventById(pendingId);
            });
        } else {
            const reloadTriggered = localStorage.getItem('map_reload_triggered') === 'true';

            if (reloadTriggered) {
            try {
                const savedCenter = localStorage.getItem('map_reload_center');
                const savedZoom   = localStorage.getItem('map_reload_zoom');

                if (savedCenter && savedZoom) {
                const c = JSON.parse(savedCenter);
                const z = parseInt(savedZoom, 10);

                // сначала зум, потом плавный пан
                map.setZoom(z);
                map.panTo(c);
                console.log('[onLoad] restored after soft reload', c, z);

                // 👇 ВАЖНО: скажем логике "домашнего адреса" ничего не делать один раз
                localStorage.setItem('skip_home_once', 'true');
            }
            } catch (e) {
                console.warn('[onLoad] restore after soft reload failed', e);
            } finally {
                // очищаем одноразовые ключи soft reload
                localStorage.removeItem('map_reload_triggered');
                localStorage.removeItem('map_reload_center');
                localStorage.removeItem('map_reload_zoom');
            }
            } else {
                const savedCenter = localStorage.getItem('map_center');
                const savedZoom   = localStorage.getItem('map_zoom');

                if (savedCenter && savedZoom) {
                try {
                    const c = JSON.parse(savedCenter);
                    const z = JSON.parse(savedZoom);
                    map.setCenter(c);
                    map.setZoom(z);
                    console.log('[onLoad] restored center from storage', c, z);
                    localStorage.setItem('skip_home_once', 'true');
                } catch {
                    console.warn('[onLoad] failed to parse saved center/zoom');
                }
                } else {
                const fallback = center; // ← берём дефолт из пропсов (Zürich HB)
                const defaultZoom = 13;
                map.setCenter(fallback);
                map.setZoom(defaultZoom);
                localStorage.setItem('map_center', JSON.stringify(fallback));
                localStorage.setItem('map_zoom', JSON.stringify(defaultZoom));
                }
            }
        }

        // 👉 Иногда контейнер уже виден, но Google не пересчитал размеры.
        // Форсируем пересчёт и рецентрирование (два раза с маленькой задержкой).
        const forceResize = () => {
            try {
            (window as any).google.maps.event.trigger(map, 'resize');
            const c = map.getCenter();
            if (c) map.setCenter(c);
            } catch {}
        };
        setTimeout(forceResize, 0);
        setTimeout(forceResize, 300);

        // 👉 Одноразовый 'idle' — это точка, когда проекция готова и есть bounds.
        const once = map.addListener('idle', () => {
            console.log('[onLoad] first idle — map ready');
            const b = map.getBounds();
            if (b) {
            fetchEventsInBounds(b); // передаём готовые границы
            } else {
            // резерв: если вдруг idle без границ, подождём чуть-чуть
            setTimeout(() => {
                const bb = map.getBounds();
                if (bb) fetchEventsInBounds(bb);
            }, 200);
            }
            (window as any).google.maps.event.removeListener(once);
        });

        // 👉 Постоянный 'idle' — подгрузка при движении/зуме (с лёгким debounce)
        let idleTimer: any;
        map.addListener('idle', () => {
            const b = map.getBounds();
            if (!b) return;
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
            console.log('[idle] fetch in bounds');
            fetchEventsInBounds(b);
            }, 200);
        });

        // Сохраняем zoom
        map.addListener('zoom_changed', () => {
            const z = map.getZoom();
            if (z != null) localStorage.setItem('map_zoom', JSON.stringify(z));
        });

        let centerTimer: any;
        map.addListener('center_changed', () => {
        clearTimeout(centerTimer);
        centerTimer = setTimeout(() => {
            const c = map.getCenter();
            if (c) {
            localStorage.setItem('map_center', JSON.stringify({ lat: c.lat(), lng: c.lng() }));
            }
        }, 250);
        });

        // Сообщаем наверх, что карта готова
        setMapReady(true);
        console.log('[onLoad] map mounted');
    }, [fetchEventsInBounds, openEventById, setMapReady]);

  const handleMapUnmount = useCallback(() => {
    console.log('[onUnmount] map unmounted');
    mapRef.current = null;
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    setSelectedEvent(null);
    if (!e.latLng) return;
    mapCenterRef.current = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    console.log('[map click] remember center', mapCenterRef.current);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!mapRef.current) return;
    const c = mapRef.current.getCenter();
    if (c) {
      mapCenterRef.current = { lat: c.lat(), lng: c.lng() };
      console.log('[drag end] center', mapCenterRef.current);
    }
  }, []);

  console.log('[MapLayer] mapRef:', mapRef);

  const isSoftReloadPending = () =>
  typeof window !== 'undefined' && localStorage.getItem('map_reload_triggered') === 'true';

  return (
    <div className="fixed inset-0 z-0">
      {mapStatus === 'loading' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded shadow z-50">
          Загрузка карты...
        </div>
      )}
      {mapStatus === 'ready' && (
        <MemoizedMap
          setMapReady={setMapReady}
          favorites={favorites.map(String)}
          mapContainerStyle={mapContainerStyle}
          options={mapOptions}
          mapRef={mapRef}
          onLoad={handleMapLoad}
          onUnmount={handleMapUnmount}
          onClick={handleMapClick}
          onDragEnd={handleDragEnd}
          events={filteredByView}
          selectedId={selectedEvent?.toString() ?? null}
          onMarkerClick={(event) => {
            console.log('[marker click]', event.id, event.lat, event.lng);
            setSelectedEvent((prev) => (prev === event.id ? null : event.id));
            setViewCount((prev) => {
              const next = prev + 1;
              if (!isAuthenticated && next === 3) setShowAuthPrompt(true);
              return next;
            });
            markAsViewed(event.id);
            scrollToEvent(event.id);
          }}
          onFavorite={() => {
            if (selected?.id) toggleFavorite(selected.id);
          }}
          onCloseInfo={() => {
            console.log('[infowindow close]');
            setSelectedEvent(null);
            if (mapRef.current) {
              const c = mapRef.current.getCenter();
              if (c) mapCenterRef.current = { lat: c.lat(), lng: c.lng() };
            }
          }}
          getMarkerIcon={getMarkerIcon}
          formatDate={formatDate}
          getDescription={getDescription}
          formatWebsite={formatWebsite}
          makeICS={makeICS}
          downloadICS={downloadICS}
          makeGoogleCalendarUrl={makeGoogleCalendarUrl}
          shareEvent={shareEvent}
        />
      )}
    </div>
  );
};

export default React.memo(MapLayer);
