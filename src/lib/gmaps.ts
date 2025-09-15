export const GMAPS_ID = 'google-map-script';

// Наш собственный союз допустимых библиотек Google Maps.
// В МАССИВ НЕ ДОБАВЛЯЕМ 'localContext', чтобы не ловить ошибки в старых версиях.
export type GMapsLib = 'places' | 'drawing' | 'geometry' | 'visualization';

// Обычный массив строк, без импортов типовой зависимости.
export const GMAPS_LIBS: GMapsLib[] = ['places'];
