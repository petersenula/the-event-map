'use client';

import { RefreshCw, Search, User, Home, Filter, List, X, Heart, Share2, CalendarPlus, CalendarClock, CalendarDays, Copy } from 'lucide-react';
import cn from 'classnames';
import DatePicker from 'react-datepicker';
import React, { Dispatch, useState, SetStateAction, useEffect, RefObject } from 'react';

interface MobileOverlayProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  i18n: any;
  t: (key: string) => string;
  availableLanguages: { code: string; label: string }[];
  handleLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleClearStorage: () => void;
  handleHomeClick: () => void;
  setShowFeedbackModal: Dispatch<SetStateAction<boolean>>;
  isAuthenticated: boolean;
  handleLogout: () => void;
  dateRange: { startDate: Date | null; endDate: Date | null; key: string }[];
  setDateRange: (range: { startDate: Date | null; endDate: Date | null; key: string }[]) => void;
  formatDate: (d: string | Date) => string;
  formatTime: (t: string) => string;
  formatWebsite: (url: string) => string;
  showEventList: boolean;
  setShowEventList: React.Dispatch<React.SetStateAction<boolean>>;
  listRef: RefObject<HTMLDivElement> | null;
  filteredByView: any[];
  visibleCount: number;
  selectedEvent: string | null;
  setSelectedEvent: (id: string | null) => void;
  getDescription: (ev: any) => string;
  shareEvent: (ev: any) => void;
  downloadICS: (ics: string, filename: string) => void;
  makeICS: (ev: any) => string;
  makeGoogleCalendarUrl: (ev: any) => string;
  favorites: string[];
  toggleFavorite: (id: string) => void | Promise<void>;
  showMobileFilters: boolean;
  setShowMobileFilters: React.Dispatch<React.SetStateAction<boolean>>;
  markerColors: { [key: string]: string };
  filterType: string[];
  setFilterType: React.Dispatch<React.SetStateAction<string[]>>;
  translateTypeUI: (type: string) => string;
  filterFormat: string[];
  setFilterFormat: React.Dispatch<React.SetStateAction<string[]>>;
  filterAge: string[];
  setFilterAge: React.Dispatch<React.SetStateAction<string[]>>;
  handleResetFilters: () => void;
  handleNavigate: (path: string) => void; // 👈 для переходов
  showAuthPrompt: boolean;
  setShowAuthPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  mapRef: React.RefObject<google.maps.Map | null>;
  showFavoritesList: boolean;
  setShowFavoritesList: React.Dispatch<React.SetStateAction<boolean>>;
  userDisplay: string;
}

const MobileOverlay: React.FC<MobileOverlayProps> = ({
  searchQuery,
  setSearchQuery,
  mapRef,
  i18n,
  t,
  availableLanguages,
  handleLanguageChange,
  handleClearStorage,
  handleHomeClick,
  isAuthenticated,
  handleLogout,
  dateRange,
  setDateRange,
  formatDate,
  formatTime,
  formatWebsite,
  showEventList,
  setShowEventList,
  listRef,
  filteredByView,
  visibleCount,
  selectedEvent,
  setSelectedEvent,
  getDescription,
  shareEvent,
  downloadICS,
  makeICS,
  makeGoogleCalendarUrl,
  favorites,
  toggleFavorite,
  showMobileFilters,
  setShowMobileFilters,
  markerColors,
  filterType,
  setFilterType,
  translateTypeUI,
  filterFormat,
  setFilterFormat,
  filterAge,
  setFilterAge,
  handleResetFilters,
  setShowFeedbackModal,
  handleNavigate,
  showAuthPrompt,
  setShowAuthPrompt,
  showFavoritesList,
  userDisplay,
  setShowFavoritesList
}) => {

    const pill =
      "pointer-events-auto no-auto-text inline-flex items-center justify-center " +
      "h-7 px-3 rounded-full bg-white/95 border border-gray-300 shadow " +
      "text-xs leading-none text-gray-900 cursor-pointer whitespace-nowrap active:scale-95";

    const lang = i18n.language;

    const [showProfile, setShowProfile] = useState(false);

    const hasActiveFilters = !!(
        filterType.length ||
        filterFormat.length ||
        filterAge.length ||
        searchQuery.trim()
    );

    const openEventList = () => {
      setShowEventList(true);
      setShowFavoritesList(false);
      setShowAuthPrompt(false);
      setShowProfile(false);
    };

    const openFavorites = () => {
      setShowFavoritesList(true);
      setShowEventList(false);
      setShowAuthPrompt(false);
      setShowProfile(false);
    };

    const openProfileModal = () => {
      setShowProfile(true);
      setShowEventList(false);
      setShowFavoritesList(false);
      setShowAuthPrompt(false);
    };

    const openAuthModal = () => {
      setShowAuthPrompt(true);
      setShowEventList(false);
      setShowFavoritesList(false);
      setShowProfile(false);
    };

    useEffect(() => {
      if (showAuthPrompt) {
        setShowEventList(false);
        setShowFavoritesList(false);
        setShowProfile(false);
      }
    }, [showAuthPrompt, setShowEventList, setShowFavoritesList]);

    useEffect(() => {
      if (showEventList) {
        setShowFavoritesList(false);
        setShowAuthPrompt(false);
        setShowProfile(false);
      }
    }, [showEventList, setShowFavoritesList, setShowAuthPrompt]);

    useEffect(() => {
      if (showFavoritesList) {
        setShowEventList(false);
        setShowAuthPrompt(false);
        setShowProfile(false);
      }
    }, [showFavoritesList, setShowEventList, setShowAuthPrompt]);

    function handleCheckboxChange(setState: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
    setState((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    }
  
    return (
      <>
        {showProfile && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center">
            {/* фон */}
                <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowProfile(false)}
                />

                {/* окно */}
                <div className="relative z-[3001] w-[95vw] max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-300">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="text-gray-700 w-6 h-6" />
                      <span className="font-semibold text-gray-800 text-sm truncate max-w-[60vw]">
                        {userDisplay || t('ui.profile')}
                      </span>
                    </div>
                    <button onClick={() => setShowProfile(false)}>
                      <X className="w-6 h-6 text-gray-400 hover:text-gray-700" />
                    </button>
                  </div>
                    {/* НЕ авторизован */}
                    {!isAuthenticated ? (
                        <div className="space-y-4 text-sm text-gray-700">
                          <p>{t('profile.please_login')}</p>
                          <button
                            onClick={openAuthModal}
                            className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
                          >
                            {t('ui.login')}
                          </button>
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm text-gray-700">
                            <button
                                onClick={() => {
                                setShowProfile(false);
                                handleLogout();
                                }}
                                className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
                                >
                                {t('ui.logout')}
                            </button>

                            <button
                                onClick={() => setShowFavoritesList(true)}
                                className="w-full border border-pink-500 text-pink-600 font-semibold px-4 py-2 rounded-full hover:bg-pink-50 flex items-center justify-center gap-2"
                                >
                                <Heart className="w-4 h-4" />
                                {t('ui.favorites')}
                            </button>

                            <div className="space-y-2">
                                <p>{t('profile.enter_address')}</p>
                                <button
                                    onClick={() => {
                                    setShowProfile(false);
                                    handleHomeClick();
                                    }}
                                    className="w-full border border-black text-gray-800 font-semibold px-4 py-2 rounded-full hover:bg-gray-100"
                                    >
                                    {t('ui.setHome')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ВЕРХНЯЯ ПАНЕЛЬ — язык + даты + кнопки */}
        <div className="fixed top-0 left-0 right-0 backdrop-blur-sm z-[2000]">
          <div className="mx-2 mt-2 mb-2 rounded-xl bg-white/95 shadow p-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                onClick={openProfileModal}
                className="p-1 rounded-full hover:bg-gray-200"
                title="Profile"
              >
                <User className="w-5 h-5 text-gray-700" />
              </button>
              <div className="flex items-center gap-2">
                <select
                    value={lang}
                    onChange={handleLanguageChange}
                    className="px-2 py-1 rounded-md shadow text-sm border border-gray-300 bg-white"
                    >
                    <option value="en">EN</option>
                    <option value="de">DE</option>
                    <option value="fr">FR</option>
                    <option value="it">IT</option>
                    <option value="ru">RU</option>
                </select>
                {/* 🆕 кнопка очистки */}
                <button
                    onClick={handleClearStorage}
                    title="Clear local storage"
                    className="text-gray-500 hover:text-red-500 transition p-1"
                    >
                    <RefreshCw size={20} />
                </button>
                <button
                  onClick={() => (showFavoritesList ? setShowFavoritesList(false) : openFavorites())}
                  className={`p-2 rounded-full border ${showFavoritesList ? 'bg-pink-100' : 'bg-white'}`}
                  title={t('ui.favorites')}
                >
                  <Heart className="w-5 h-5 text-pink-600" />
                </button>
                {/* Filters button */}
                <button
                    onClick={() => setShowMobileFilters(true)}
                    className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100"
                    title={t('filters.header')}
                >
                    <Filter className={`w-5 h-5 ${hasActiveFilters ? 'text-green-600' : 'text-gray-600'}`} />
                </button>
                <button
                  onClick={() => (showEventList ? setShowEventList(false) : openEventList())}
                  className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100"
                  title={showEventList ? t('ui.hideList') : t('ui.showList')}
                >
                  <List className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* строка 2: компактные даты + выбранный период */}
            <div className="grid grid-cols-2 gap-2">
              {/* START DATE */}
              <div className="bg-white/90 text-black border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                <DatePicker
                  selected={dateRange[0]?.startDate ?? null}
                  onChange={(date: Date | null) =>
                    setDateRange([{ ...dateRange[0], startDate: date }])
                  }
                  selectsStart
                  startDate={dateRange[0]?.startDate ?? undefined}
                  endDate={dateRange[0]?.endDate ?? undefined}
                  placeholderText={t('Start of period')}
                  dateFormat="dd.MM.yyyy"
                  className="w-full !bg-transparent !text-black text-xs"
                  calendarClassName="dp-sm"
                  popperClassName="dp-sm"
                />  
              </div>

              {/* END DATE */}
              <div className="bg-white/90 text-black border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                <DatePicker
                  selected={dateRange[0]?.endDate ?? null}
                  onChange={(date: Date | null) =>
                    setDateRange([{ ...dateRange[0], endDate: date }])
                  }
                  selectsEnd
                  startDate={dateRange[0]?.startDate ?? undefined}
                  endDate={dateRange[0]?.endDate ?? undefined}
                  minDate={dateRange[0]?.startDate ?? undefined}  // <-- ключевая строка
                  placeholderText={t('End of period')}
                  dateFormat="dd.MM.yyyy"
                  className="w-full !bg-transparent !text-black text-xs"
                  calendarClassName="dp-sm"
                  popperClassName="dp-sm"
                />
              </div>
            </div>

            {dateRange[0].startDate && dateRange[0].endDate && (
              <div className="mt-2">
                <div className="inline-flex items-center bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">
                  <span>
                    {formatDate(dateRange[0].startDate.toISOString())} - {formatDate(dateRange[0].endDate.toISOString())}
                  </span>
                  <button
                    onClick={() => setDateRange([{ startDate: null, endDate: null, key: 'selection' }])}
                    className="ml-2 text-gray-600 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 w-full max-w-[300px] bg-white border border-gray-300 rounded-md shadow-sm px-2 py-1">
            <Search className="w-5 h-3 text-gray-500 text-xs flex-shrink-0" />
            <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            </div>
          </div>
        </div>

        {/* ШТОРКА СПИСКА — ПРОКРУЧИВАЕМАЯ */}
        {showEventList && (
          <div
            ref={listRef}
            className="fixed left-0 right-0 z-[2000] bg-white/95 p-3 shadow-2xl rounded-t-2xl overflow-y-auto"
            style={{
              top: '120px',        // высота зоны с верхней панелью (~120px)
              bottom: 0,           // до низа
              WebkitOverflowScrolling: 'touch',
            }}
          >
          {filteredByView.slice(0, visibleCount).map((event) => {
            const isSelected = selectedEvent === event.id;

            return (
              <div
                id={`event-${event.id}`}
                key={event.id}
                onClick={() =>
                  setSelectedEvent(selectedEvent === event.id ? null : event.id)
                }
                className={`mb-4 p-3 rounded-lg transition-colors duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-yellow-100 border-yellow-400 shadow-lg'
                    : 'bg-white border border-gray-200 shadow'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 mb-1">{event.title}</h3>
                    <p className="text-xs text-gray-800 mb-1">{getDescription(event)}</p>
                    <p className="text-xs text-gray-600 mb-1">📍 {event.address}</p>
                    <p className="text-xs text-gray-600">
                      🕒 {formatDate(event.start_date)} – {formatDate(event.end_date)} {formatTime(event.start_time)} – {formatTime(event.end_time)}
                    </p>
                    {event.website && (
                      <p className="text-xs text-blue-600 mt-1">
                        <a href={event.website} target="_blank" rel="noopener noreferrer">🔗 {formatWebsite(event.website)}</a>
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); shareEvent(event); }}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300"
                      >
                        <Share2 className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadICS(makeICS(event), `${(event.title || 'event').replace(/[^\w\-]+/g,'_')}.ics`); }}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300"
                      >
                        <CalendarPlus className="w-5 h-5 text-gray-600" />
                      </button>
                      <a
                        href={makeGoogleCalendarUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300"
                      >
                        <CalendarDays className="w-5 h-5 text-gray-600" />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); console.log('[UI] Heart clicked:', event.id); toggleFavorite(event.id); }}
                    className="shrink-0 p-1 rounded hover:bg-gray-100"
                    aria-label="favorite"
                    title="favorite"
                    >
                   <Heart
                        className={`w-5 h-5 ${favorites.includes(event.id) ? 'text-pink-600' : 'text-gray-400'}`}
                        fill={favorites.includes(event.id) ? 'currentColor' : 'none'}
                        />
                    </button>
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* ПАНЕЛЬ ФИЛЬТРОВ СНИЗУ */}
        {showMobileFilters && (
          <div
            className={cn(
              'fixed inset-0 z-[2000] transition-opacity duration-300',
              showMobileFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowMobileFilters(false)}
            />
            <div
              className={cn(
                'absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[80vh] overflow-y-auto transform transition-all duration-300',
                showMobileFilters ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">{t('filters.header')}</h3>
                <button onClick={() => setShowMobileFilters(false)}>✕</button>
              </div>

              {/* Блоки фильтров — те же, что на десктопе, только компактнее */}
              <h4 className="text-sm font-bold text-gray-800 mb-2">{t('filters.theme')}</h4>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {Object.keys(markerColors).map((type) => {
                  const isSelected = filterType.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleCheckboxChange(setFilterType, type)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition
                        ${isSelected ? 'bg-green-200 text-black' : 'bg-white text-black'}
                        hover:bg-green-100 active:scale-95`}
                    >
                      {translateTypeUI(type)}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm font-bold text-gray-800 mb-2">{t('filters.for')}</p>
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                {['any', 'children', 'adults'].map((format) => {
                  const isSelected = filterFormat.includes(format);
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleCheckboxChange(setFilterFormat, format)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition
                        ${isSelected ? 'bg-green-200 text-black' : 'bg-white text-black'}
                        hover:bg-green-100 active:scale-95`}
                    >
                      {t(`filters.${format}`)}
                    </button>
                  );
                })}
              </div>

              <p className="text-sm font-bold text-gray-800 mb-2">{t('filters.age')}</p>
              <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                {['0-2', '3-5', '6-8', '9-12', '13-17', '18+', 'any'].map((age) => {
                  const isSelected = filterAge.includes(age);
                  return (
                    <button
                      key={age}
                      type="button"
                      onClick={() => handleCheckboxChange(setFilterAge, age)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition
                        ${isSelected ? 'bg-green-200 text-black' : 'bg-white text-black'}
                        hover:bg-green-100 active:scale-95`}
                    >
                      {age}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-white text-red-600 text-sm px-4 py-2 rounded-full border border-red-300 hover:bg-red-50 transition"
                >
                  {t('filters.reset')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed left-2 z-[100] md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
              {/* прозрачный контейнер как у верхнего, только без фона */}
          <div className="inline-flex items-center gap-2 rounded-xl bg-transparent p-0 origin-bottom scale-[0.9]">
            <button
              type="button"
              onClick={() => handleNavigate('/add-event')}
              className={pill}
            >
              {t('ui.addEvent')}
            </button>

            <button
              type="button"
              onClick={() => setShowFeedbackModal(true)}
              className={pill}
            >
              {t('ui.feedback')}
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/privacy')}
              className={pill}
            >
              {t('ui.privacy')}
            </button>
          </div>
        </div>
      </>
    );
  };

export default MobileOverlay;