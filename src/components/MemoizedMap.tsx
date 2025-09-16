'use client'

import React from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Share2, CalendarPlus, CalendarDays, Copy, Calendar, MapPin, Heart, Link as LinkIcon } from 'lucide-react';
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
}) => {
  const selected = selectedId
  ? events.find(ev => String(ev.id) === selectedId)
  : null;

const isSelectedFav = selected
  ? favorites.includes(String(selected.id))
  : false;

  // Функция копирования адреса
  const handleCopyAddress = async () => {
    if (selected?.address) {
      try {
        await navigator.clipboard.writeText(selected.address);
        console.log('Address copied!');
      } catch (err) {
        console.error('Failed to copy address: ', err);
      }
    }
  };
  const { i18n } = useTranslation();
  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      options={options}
      onLoad={(map) => {
        mapRef.current = map;
        setMapReady(true);
        onLoad(map);
      }}
      onUnmount={(map) => {
        onUnmount(map);
      }}
      onClick={onClick}
      onDragEnd={onDragEnd}
    >
      {events.map((event) => (
        <Marker
          key={event.id}
          position={{ lat: Number(event.lat), lng: Number(event.lng) }}
          icon={getMarkerIcon(event.type ?? ['other'])}
          onClick={() => onMarkerClick(event)}
          onDblClick={() => onFavorite(event.id)}
        />
      ))}

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
                onClick={handleCopyAddress}
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
              {/* ❤️ Избранное */}
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
  return (
    prev.selectedId === next.selectedId &&
    prev.events === next.events &&
    prev.favorites === next.favorites
  );
}

export default React.memo(MemoizedMap, areEqual);

