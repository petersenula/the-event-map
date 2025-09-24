'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import {
  Share2, CalendarPlus, CalendarDays, Copy, Calendar, MapPin, Heart, Link as LinkIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  setMapReady: (ready: boolean) => void;
  favorites: string[];
  mapRef: React.RefObject<google.maps.Map | null>;
  mapContainerStyle: React.CSSProperties;
  options: google.maps.MapOptions;
  onLoad: (map: google.maps.Map) => void;
  onUnmount: (map: google.maps.Map) => void;
  onClick: (e: google.maps.MapMouseEvent) => void;
  onDragEnd: () => void;
  events: {
    id: string | number;
    lat: string | number;
    lng: string | number;
    type?: string[];
    address?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
    website?: string;
    [key: string]: any;
  }[];
  selectedId: string | null;
  onMarkerClick: (event: any) => void;
  onFavorite: (id: string | number) => void;
  onCloseInfo: () => void;
  getMarkerIcon: (types?: string[]) => string;
  formatDate: (d: string) => string;
  getDescription: (ev: any) => string;
  formatWebsite: (w: string) => string;
  makeICS: (ev: any) => string;
  downloadICS: (ics: string, filename: string) => void;
  makeGoogleCalendarUrl: (ev: any) => string;
  shareEvent: (ev: any) => void;

  /** ← НОВОЕ: координаты домашнего местоположения (если есть) */
  homeLocation?: { lat: number; lng: number } | null;
}

const MemoizedMap: React.FC<Props> = ({
  setMapReady,
  favorites,
  mapRef,
  mapContainerStyle,
  options,
  onLoad,
  onUnmount,
  onClick,
  onDragEnd,
  events,
  selectedId,
  onMarkerClick,
  onFavorite,
  onCloseInfo,
  getMarkerIcon,
  formatDate,
  getDescription,
  formatWebsite,
  makeICS,
  downloadICS,
  makeGoogleCalendarUrl,
  shareEvent,
  homeLocation, // ← НОВОЕ
}) => {
  const selected = selectedId
    ? events.find((ev) => String(ev.id) === selectedId)
    : null;

  const isSelectedFav = selected ? favorites.includes(String(selected.id)) : false;

  // ===== SVG-иконка ДОМ =====
  const makeHomeIcon = (size = 30) => {
    const s = size;
    const strokeColor = '#6B7280'; // светло-серый (tailwind gray-500)
    const fillColor = '#E5E7EB'; // tailwind gray-200

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="white" stroke="${strokeColor}" stroke-width="1.5" />
        <path d="M12 5l5 4.5v7.5h-3v-5H10v5H7V9.5L12 5z"
              fill="${strokeColor}" stroke="white" stroke-width="1" stroke-linejoin="round"/>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  // ====== 1) Группируем события по координатам ======
  type Group = {
    key: string;
    center: { lat: number; lng: number };
    items: any[];
    size: number;
  };

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const ev of events) {
      const lat = Number(ev.lat);
      const lng = Number(ev.lng);
      const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`;
      const g = map.get(key);
      if (g) {
        g.items.push(ev);
        g.size++;
      } else {
        map.set(key, { key, center: { lat, lng }, items: [ev], size: 1 });
      }
    }
    return Array.from(map.values());
  }, [events]);

  // SVG-иконка кольца (подсветка под маркером)
  const makeRingIcon = (diameter = 44, color = '#60A5FA') => {
    const radius = diameter / 2 - 2;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
            <feOffset in="blur" dx="0" dy="0" result="offset"/>
            <feMerge>
              <feMergeNode in="offset"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="${diameter/2}" cy="${diameter/2}" r="${radius}"
                fill="rgba(96,165,250,0.16)" stroke="${color}" stroke-width="2"
                filter="url(#shadow)"/>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  // ====== 2) «Развернутая» группа (паучок) ======
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Переводим радиус в пикселях в смещение широты/долготы на текущем зуме
  const circlePositions = useCallback(
    (group: Group): { lat: number; lng: number }[] => {
      const n = group.size;
      if (n <= 1) return [group.center];

      const zoom = mapRef.current?.getZoom() ?? 14;
      const { lat, lng } = group.center;

      const rPx = Math.min(60, 26 + n * 4);

      const EARTH_RADIUS = 6378137; // м
      const metersPerPixel =
        (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS) /
        (256 * Math.pow(2, zoom));

      const rMeters = rPx * metersPerPixel;

      const metersPerDegLat = 111320;
      const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);

      const dLat = rMeters / metersPerDegLat;
      const dLng = rMeters / metersPerDegLng;

      const arr: { lat: number; lng: number }[] = [];
      for (let i = 0; i < n; i++) {
        const t = (2 * Math.PI * i) / n;
        arr.push({
          lat: lat + dLat * Math.sin(t),
          lng: lng + dLng * Math.cos(t),
        });
      }
      return arr;
    },
    [mapRef]
  );

  // Обертки для схлопывания «паука»
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      setExpandedKey(null);
      onClick(e);
    },
    [onClick]
  );

  const handleDragEnd = useCallback(() => {
    setExpandedKey(null);
    onDragEnd();
  }, [onDragEnd]);

  const { i18n } = useTranslation();

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      options={options}
      onLoad={(map) => {
        mapRef.current = map;
        setMapReady(true);
        onLoad(map);
        map.addListener('zoom_changed', () => setExpandedKey(null));
      }}
      onUnmount={(map) => {
        onUnmount(map);
        mapRef.current = null;
      }}
      onClick={handleMapClick}
      onDragEnd={handleDragEnd}
    >
      {/* ===== НОВОЕ: маркер домашнего местоположения ===== */}
      {homeLocation && (() => {
        const g = typeof window !== 'undefined' ? (window as any).google : undefined;
        console.log('🏠 Rendering home marker at', homeLocation, 'google =', !!g);
        const size = 30;
        return (
          <Marker
            key="home-marker"// 👈 ключ, чтобы не кешировался
            position={homeLocation}
            zIndex={2000}
            clickable={false}
            icon={{
              url: makeHomeIcon(size, '#111827'),                 // домик (тёмно-серый)
              scaledSize: g ? new g.maps.Size(size, size) : undefined,
              anchor: g ? new g.maps.Point(size / 2, size - 2) : undefined
            }}
            title="Home"
          />
        );
      })()}

      {/* ====== 3) Рисуем либо «свернутую» группу, либо «разлёт» ====== */}
      {groups.flatMap((group) => {
        if (expandedKey === group.key && group.size > 1) {
          return circlePositions(group).map((pos, i) => {
            const g = (typeof window !== 'undefined' ? (window as any).google : undefined);
            const d = 44;
            const ev = group.items[i];

            return (
              <React.Fragment key={`exp-wrap-${group.key}-${i}`}>
                {g && (
                  <Marker
                    key={`ring-${group.key}-${i}`}
                    position={pos}
                    clickable={false}
                    zIndex={999}
                    icon={{
                      url: makeRingIcon(d, '#e6e2bbff'),
                      scaledSize: new g.maps.Size(d, d),
                      anchor: new g.maps.Point(d / 2, d / 2),
                    }}
                  />
                )}

                <Marker
                  key={`marker-${group.key}-${i}`}
                  position={pos}
                  icon={getMarkerIcon(ev.type ?? ['other'])}
                  zIndex={1000}
                  animation={g?.maps?.Animation?.DROP}
                  onClick={() => onMarkerClick(ev)}
                  onDblClick={() => onFavorite(ev.id)}
                />
              </React.Fragment>
            );
          });
        }

        const ev0 = group.items[0];
        const label =
          group.size > 1
            ? {
                text: String(group.size),
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
              }
            : undefined;

        return (
          <Marker
            key={`group-${group.key}`}
            position={group.center}
            icon={getMarkerIcon(ev0.type ?? ['other'])}
            label={label}
            onClick={() =>
              group.size > 1 ? setExpandedKey(group.key) : onMarkerClick(ev0)
            }
            onDblClick={() => onFavorite(ev0.id)}
          />
        );
      })}

      {/* ====== 4) InfoWindow — как было ====== */}
      {selected && (
        <InfoWindow
          key={i18n.language}
          position={{ lat: Number(selected.lat), lng: Number(selected.lng) }}
          options={{ disableAutoPan: true }}
          onCloseClick={onCloseInfo}
        >
          <div
            style={{ maxHeight: '33vh', overflowY: 'auto', width: '250px' }}
            className="scrollbar-thin scrollbar-thumb-gray-300 text-sm text-black p-4 rounded"
          >
            {selected.start_date && selected.end_date && (
              <p className="font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-600" />
                {selected.start_date === selected.end_date
                  ? formatDate(selected.start_date)
                  : `${formatDate(selected.start_date)} - ${formatDate(selected.end_date)}`}
              </p>
            )}
            <p className="mb-1 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="flex-1">{selected.address}</span>
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(selected.address ?? ''); } catch {}
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Copy address"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </p>

            <h2 className="font-bold mb-1">{selected.title}</h2>
            <p className="mb-1">{getDescription(selected)}</p>

            {selected.website && (
              <a
                href={formatWebsite(selected.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-words flex items-center gap-1"
              >
                <LinkIcon className="w-4 h-4 text-blue-600" />
                {formatWebsite(selected.website)}
              </a>
            )}

            <div className="mt-4 flex gap-2 justify-start">
              <button
                onClick={() => onFavorite(String(selected.id))}
                className="p-1 hover:bg-gray-100 rounded"
                title={isSelectedFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={`w-5 h-5 ${isSelectedFav ? 'text-pink-600' : 'text-gray-600'}`}
                  fill={isSelectedFav ? 'currentColor' : 'none'}
                />
              </button>
              <button
                onClick={() => shareEvent(selected)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Share"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => downloadICS(makeICS(selected), 'event.ics')}
                className="p-1 hover:bg-gray-100 rounded"
                title="Add to Calendar"
              >
                <CalendarPlus className="w-5 h-5 text-gray-600" />
              </button>
              <a
                href={makeGoogleCalendarUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-gray-100 rounded"
                title="Google Calendar"
              >
                <CalendarDays className="w-5 h-5 text-gray-600" />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

function areEqual(prev: Props, next: Props) {
  const sameHome =
    (!!prev.homeLocation === !!next.homeLocation) &&
    (!prev.homeLocation ||
      (prev.homeLocation.lat === next.homeLocation!.lat &&
       prev.homeLocation.lng === next.homeLocation!.lng));

  return (
    prev.selectedId === next.selectedId &&
    prev.events === next.events &&
    prev.favorites === next.favorites &&
    sameHome // ← учитываем изменения домашней точки
  );
}

export default React.memo(MemoizedMap, areEqual);
