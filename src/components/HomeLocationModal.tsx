'use client'

import React, { useRef, useState, useCallback } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Home, Locate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase/client';

const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

interface Props {
  onClose: () => void;
  onSaved: () => void;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
}

const HomeLocationModal: React.FC<Props> = ({ onClose, onSaved, mapRef }) => {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const saveLocation = async (lat: number, lng: number, label: string, source: string) => {
    const location = { lat, lng, label, source };
    const { error } = await supabase
      .from('profiles')
      .update({ home_location: location })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);

    if (!error) {
      onSaved();
      onClose();
    } else {
      alert('Error saving location');
    }
  };

  const useGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert(t('geo.unsupported'));
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        saveLocation(latitude, longitude, 'My location', 'geolocation');
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(13);
        }
        setLocating(false);
      },
      (err) => {
        alert(t('geo.error'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [t, mapRef]);

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;
    const lat = loc.lat(), lng = loc.lng();
    const label = place.formatted_address || place.name || 'Custom';
    saveLocation(lat, lng, label, 'manual');
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(13);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-5 rounded-2xl w-[90%] max-w-md space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Home className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-800">{t('geo.setHome')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl">×</button>
        </div>

        {/* Button: Use geolocation */}
        {isMobile && (
          <button
            onClick={useGeolocation}
            className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <Locate className="w-4 h-4" />
            {locating ? t('geo.locating') : t('geo.useMyLocation')}
          </button>
        )}
        {/* OR text */}
        <div className="text-center text-gray-500 text-sm font-medium">{t('geo.or')}</div>

        {/* Address field */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('geo.enterAddress')}</label>
          <Autocomplete
            onLoad={(ac) => (autocompleteRef.current = ac)}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              placeholder="Search address"
              className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm"
            />
          </Autocomplete>
        </div>

        {/* Button to pick on map (временно закомментировано) */}
        {/* 
        <button
          onClick={() => alert('Выбор точки на карте мы добавим позже')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <MapPin className="w-4 h-4" />
          {t('geo.pickOnMap')}
        </button> 
        */}
      </div>
    </div>
  );
};

export default HomeLocationModal;
