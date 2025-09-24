// hooks/useHomeLocation.ts
'use client';

import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'homeLocation';

export type HomeLocation = { lat: number; lng: number } | null;

export function useHomeLocation() {
  const [homeLocation, setHomeLocation] = useState<HomeLocation>(null);

  // Читаем из localStorage при запуске
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.lat && parsed?.lng) {
          setHomeLocation(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load homeLocation from localStorage:', e);
    }
  }, []);

  // Обновляем localStorage при изменении
  const updateHomeLocation = (loc: HomeLocation) => {
    try {
      if (loc) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loc));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
      setHomeLocation(loc);
    } catch (e) {
      console.error('Failed to save homeLocation to localStorage:', e);
    }
  };

  return { homeLocation, updateHomeLocation };
}
