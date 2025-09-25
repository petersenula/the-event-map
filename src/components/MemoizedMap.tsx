'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import {
  Share2, CalendarPlus, CalendarDays, Copy, Calendar, MapPin, Heart, Link as LinkIcon, ChevronLeft
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
    start_time?: string | null;
    end_time?: string | null;
    [key: string]: any;
  }[];
  selectedId: string | null;
  onMarkerClick: (event: any) => void;               // вызывает логику счётчика просмотров и т.п.
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

  /** координаты домашнего местоположения (если есть) */
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
  homeLocation,
}) => {

  // ===== ВЫБРАННОЕ одиночное событие (как раньше) =====
  const selected = selectedId
    ? events.find((ev) => String(ev.id) === selectedId)
    : null;
  const isSelectedFav = selected ? favorites.includes(String(selected.id)) : false;

  const { i18n, t } = useTranslation();

  // ===== SVG-иконка ДОМ (для home маркера) =====
  const makeHomeIcon = (size = 30) => {
    const s = size;
    const strokeColor = '#6B7280'; // gray-500
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="white" stroke="${strokeColor}" stroke-width="1.5" />
        <path d="M12 5l5 4.5v7.5h-3v-5H10v5H7V9.5L12 5z"
              fill="${strokeColor}" stroke="white" stroke-width="1" stroke-linejoin="round"/>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  // ===== 1) Группируем события по точным координатам =====
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

  // ===== 2) Состояние ОТКРЫТОЙ ГРУППЫ и АКТИВНОГО события в группе =====
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [groupActiveId, setGroupActiveId] = useState<string | number | null>(null);

  const openGroup = useMemo(
    () => (openGroupKey ? groups.find((g) => g.key === openGroupKey) ?? null : null),
    [groups, openGroupKey]
  );

  // Закрытие группы (и её внутреннего экрана)
  const closeGroup = useCallback(() => {
    setOpenGroupKey(null);
    setGroupActiveId(null);
  }, []);

  // Служебное: клик по карте и завершение перетаскивания закрывают список/детали группы
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      closeGroup();
      onClick(e);
    },
    [onClick, closeGroup]
  );

  const handleDragEnd = useCallback(() => {
    closeGroup();
    onDragEnd();
  }, [onDragEnd, closeGroup]);

  // ====== РЕНДЕР ======
  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      options={options}
      onLoad={(map) => {
        mapRef.current = map;
        setMapReady(true);
        onLoad(map);
        map.addListener('zoom_changed', () => {
          // при смене зума не трогаем список — пусть остаётся открыт
        });
      }}
      onUnmount={(map) => {
        onUnmount(map);
        mapRef.current = null;
      }}
      onClick={handleMapClick}
      onDragEnd={handleDragEnd}
    >
      {/* Домашний маркер */}
      {homeLocation && (() => {
        const g = typeof window !== 'undefined' ? (window as any).google : undefined;
        const size = 30;
        return (
          <Marker
            key="home-marker"
            position={homeLocation}
            zIndex={2000}
            clickable={false}
            icon={{
              url: makeHomeIcon(size),
              scaledSize: g ? new g.maps.Size(size, size) : undefined,
              anchor: g ? new g.maps.Point(size / 2, size - 2) : undefined
            }}
            title="Home"
          />
        );
      })()}

      {/* Маркеры: одиночные и групповые */}
      {groups.map((group) => {
        const ev0 = group.items[0];
        const isGroup = group.size > 1;

        const label =
          isGroup
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
            onClick={() => {
              if (isGroup) {
                // Открываем список событий в этой точке
                setOpenGroupKey(group.key);
                setGroupActiveId(null);
              } else {
                onMarkerClick(ev0);
              }
            }}
            onDblClick={() => onFavorite(ev0.id)}
          />
        );
      })}

      {/* ====== InfoWindow ДЛЯ ГРУППЫ ====== */}
      {openGroup && (
        <InfoWindow
          position={openGroup.center}
          onCloseClick={() => {
            closeGroup();
            onCloseInfo();             // чтобы сбросить selectedId наверху
          }}
          options={{ disableAutoPan: true }}
        >
          {/* Контейнер окна */}
          <div style={{ width: 280, maxHeight: '40vh', overflowY: 'auto' }} className="text-sm text-black">
            {/* 1) СПИСОК СОБЫТИЙ */}
            {!groupActiveId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">
                  {t('ui.eventsHere', { count: openGroup.size })}
                </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {openGroup.items.map((ev: any) => {
                    const isFav = favorites.includes(String(ev.id));
                    return (
                      <button
                        key={ev.id}
                        className="w-full text-left py-2 hover:bg-gray-50"
                        onClick={() => {
                          // вызывем onMarkerClick ради счётчика/логики,
                          // но показываем детали ВНУТРИ этого окна
                          onMarkerClick(ev);
                          setGroupActiveId(String(ev.id));
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-white text-xs">
                              {openGroup.items.indexOf(ev) + 1}
                            </span>
                          </div>
                          <div className="min-w-0">
                          <div className="font-semibold truncate">{ev.title}</div>
                          {/* Дата + время */}
                          {(ev.start_date || ev.end_date) && (
                            <div className="text-xs text-gray-600">
                              {ev.start_date === ev.end_date
                                ? formatDate(ev.start_date)
                                : `${formatDate(ev.start_date)} - ${formatDate(ev.end_date)}`}
                              {ev.start_time && (
                                <> • {ev.start_time.slice(0,5)}</>
                              )}
                            </div>
                          )}
                          {/* Адрес */}
                          {ev.address && (
                            <div className="text-xs text-gray-500 truncate">{ev.address}</div>
                          )}

                          </div>
                          <div className="ml-auto">
                            <Heart
                              className={`w-4 h-4 ${isFav ? 'text-pink-600' : 'text-gray-400'}`}
                              fill={isFav ? 'currentColor' : 'none'}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2) ДЕТАЛИ ОДНОГО СОБЫТИЯ ИЗ СПИСКА */}
            {groupActiveId && (() => {
              const ev = openGroup.items.find((x) => String(x.id) === String(groupActiveId));
              if (!ev) return null;

              const isFav = favorites.includes(String(ev.id));

              return (
                <div>
                  <button
                    onClick={() => setGroupActiveId(null)}
                    className="mb-2 inline-flex items-center gap-1 text-gray-700 hover:text-black"
                    title="Back to list"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  {(ev.start_date || ev.end_date) && (
                    <p className="font-bold mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      {ev.start_date === ev.end_date
                        ? formatDate(ev.start_date)
                        : `${formatDate(ev.start_date)} - ${formatDate(ev.end_date)}`}
                    </p>
                  )}

                  <p className="mb-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span className="flex-1">{ev.address}</span>
                    <button
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(ev.address ?? ''); } catch {}
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </p>

                  <h2 className="font-bold mb-1">{ev.title}</h2>
                  <p className="mb-1">{getDescription(ev)}</p>

                  {ev.website && (
                    <a
                      href={formatWebsite(ev.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-words flex items-center gap-1"
                    >
                      <LinkIcon className="w-4 h-4 text-blue-600" />
                      {formatWebsite(ev.website)}
                    </a>
                  )}

                  <div className="mt-3 flex gap-2 justify-start">
                    <button
                      onClick={() => onFavorite(ev.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`w-5 h-5 ${isFav ? 'text-pink-600' : 'text-gray-600'}`}
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => shareEvent(ev)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Share"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => downloadICS(makeICS(ev), 'event.ics')}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Add to Calendar"
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
              );
            })()}
          </div>
        </InfoWindow>
      )}

      {/* ====== Обычное InfoWindow для одиночного события (показываем только когда НЕТ открытой группы) ====== */}
      {!openGroup && selected && (
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
                className="p-1 hover:bg-gray-100 rounded"
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
    sameHome
  );
}

export default React.memo(MemoizedMap, areEqual);
