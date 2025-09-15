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
  fetchEventsInBounds: () => void;
  openEventById: (id: number) => void;
  center: { lat: number; lng: number };
  showEventList: boolean;
  visibleCount: number;
  filteredByView: any[];
  favorites: string[]; 
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
    const checkAndSetHomeLocation = async () => {
        try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profileData, error } = await supabase
            .from('profiles')
            .select('home_location')
            .eq('id', user.id)
            .single();

            if (error) {
            console.warn('[HOME LOCATION] Ошибка при загрузке профиля:', error.message);
            return;
            }

            if (profileData?.home_location) {
            const { lat, lng } = profileData.home_location;

            // Устанавливаем центр и зум карты
            if (mapRef.current) {
                mapRef.current.panTo({ lat, lng });
                mapRef.current.setZoom(12);
                console.log('[HOME LOCATION] Центр карты установлен из профиля');
            }

            // Сохраняем в localStorage
            localStorage.setItem('saved_center', JSON.stringify({ lat, lng }));
            localStorage.setItem('saved_zoom', '12');
            } else {
            console.log('[HOME LOCATION] Домашнее местоположение не задано');
            }
        }
        } catch (err) {
        console.error('[HOME LOCATION] Ошибка:', err);
        }
    };

    checkAndSetHomeLocation();
    }, []);

    useEffect(() => {
    console.log('[useEffect] mapReady:', mapReady, 'mapRef:', mapRef.current);
    if (!mapReady || !mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    if (bounds) {
        console.log('[map bounds] triggering fetch');
        fetchEventsInBounds();
    }
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

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    const pendingId = initialEventIdRef.current;

    if (pendingId) {
      (window as any).google.maps.event.addListenerOnce(map, 'idle', () => {
        openEventById(pendingId);
      });
    } else {
      const savedCenter = localStorage.getItem('map_center');
      const savedZoom = localStorage.getItem('map_zoom');

      if (savedCenter && savedZoom) {
        const c = JSON.parse(savedCenter);
        const z = JSON.parse(savedZoom);
        map.setCenter(c);
        map.setZoom(z);
        console.log('[onLoad] restored center from storage', c, z);
      } else {
        const fallback = { lat: 46.8182, lng: 8.2275 };
        map.setCenter(fallback);
        const defaultZoom = 10;
        map.setZoom(defaultZoom);
        localStorage.setItem('map_zoom', JSON.stringify(defaultZoom));
      }
    }

    map.addListener('idle', () => {
      const c = map.getCenter();
      const z = map.getZoom();

      if (c && z != null) {
        localStorage.setItem('map_center', JSON.stringify({ lat: c.lat(), lng: c.lng() }));
        localStorage.setItem('map_zoom', JSON.stringify(z));
        console.log('[idle] saved center:', c.toUrlValue(), 'zoom:', z);
      }

      fetchEventsInBounds();
    });

    map.addListener('zoom_changed', () => {
      const z = map.getZoom();
      if (z != null) localStorage.setItem('map_zoom', JSON.stringify(z));
    });

    console.log('[onLoad] map mounted');
  }, [fetchEventsInBounds, openEventById]);

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
