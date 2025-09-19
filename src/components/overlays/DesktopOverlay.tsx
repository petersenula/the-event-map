import { RefreshCw, Search, User, Home, Filter, List, X, Heart, Share2, CalendarPlus, CalendarClock, CalendarDays, Copy } from 'lucide-react';
import DatePicker from 'react-datepicker';
import Link from 'next/link';
import { RefObject } from 'react';
import React, { Dispatch, SetStateAction, useState, useEffect } from 'react';

interface DesktopOverlayProps {
  favorites: string[];                               
  toggleFavorite: (id: string) => void | Promise<void>;  
  searchQuery: string;
  setShowAuthPrompt: (val: boolean) => void;
  setSearchQuery: (value: string) => void;
  dateRange: { startDate: Date | null; endDate: Date | null; key: string }[];
  setDateRange: (range: { startDate: Date | null; endDate: Date | null; key: string }[]) => void;
  formatDate: (d: string) => string;
  formatTime: (d: string) => string;
  formatWebsite: (w: string) => string;
  setShowFeedbackModal: Dispatch<SetStateAction<boolean>>;
  getDescription: (ev: any) => string;
  i18n: any;
  t: (key: string) => string;
  availableLanguages: { code: string; label: string }[];
  handleLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleClearStorage: () => void;
  handleHomeClick: () => void;
  isAuthenticated: boolean;
  handleLogout: () => void;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  handleResetFilters: () => void;
  markerColors: { [key: string]: string };
  filterType: string[];
  setFilterType: React.Dispatch<React.SetStateAction<string[]>>;
  translateTypeUI: (type: string) => string;
  filterFormat: string[];
  setFilterFormat: React.Dispatch<React.SetStateAction<string[]>>;
  filterAge: string[];
  setFilterAge: React.Dispatch<React.SetStateAction<string[]>>;
  showEventList: boolean;
  setShowEventList: React.Dispatch<React.SetStateAction<boolean>>;
  listRef: RefObject<HTMLDivElement> | null;
  filteredByView: any[];
  visibleCount: number;
  selectedEvent: string | null;
  setSelectedEvent: (id: string | null) => void;
  shareEvent: (ev: any) => void;
  downloadICS: (ics: string, filename: string) => void;
  makeICS: (ev: any) => string;
  makeGoogleCalendarUrl: (ev: any) => string;
  mapRef: React.RefObject<google.maps.Map | null>;
  showFavoritesList: boolean;
  setShowFavoritesList: React.Dispatch<React.SetStateAction<boolean>>;
  userDisplay: string;
  showAuthPrompt: boolean;
}

const DesktopOverlay: React.FC<DesktopOverlayProps> = ({
  favorites,                
  toggleFavorite,            
  dateRange,
  searchQuery,
  mapRef,
  setSearchQuery,
  setDateRange,
  setShowFeedbackModal,
  formatDate,
  formatTime,
  formatWebsite,
  getDescription,
  i18n,
  t,
  availableLanguages,
  handleLanguageChange,
  handleClearStorage,
  handleHomeClick,
  isAuthenticated,
  handleLogout,
  showFilters,
  setShowFilters,
  handleResetFilters,
  markerColors,
  filterType,
  setFilterType,
  translateTypeUI,
  filterFormat,
  setFilterFormat,
  filterAge,
  setFilterAge,
  showEventList,
  setShowEventList,
  listRef,
  filteredByView,
  visibleCount,
  selectedEvent,
  setSelectedEvent,
  shareEvent,
  downloadICS,
  makeICS,
  makeGoogleCalendarUrl,
  setShowAuthPrompt,
  showFavoritesList,
  setShowFavoritesList,
  userDisplay,
  showAuthPrompt, 
}) => {

    // безопасные значения для пикеров
    const start: Date | null = dateRange[0]?.startDate ?? null;
    const end: Date | null = dateRange[0]?.endDate ?? null;
    const lang = i18n.language;
    const [showProfile, setShowProfile] = useState(false);
    // 👇 ДОБАВЬ внутри DesktopOverlay (рядом с const [showProfile, setShowProfile] = useState(false);)
    const openEventList = () => {
      setShowEventList(true);
      setShowFavoritesList(false);
      setShowAuthPrompt(true && false); // не открываем, просто гарантированно закрыто
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
        {/* ЛЕВАЯ ПАНЕЛЬ */}
        <div className="fixed top-15 left-4 z-[60] w-[25vw] min-w-[300px] max-w-[420px]">
            {showProfile && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
                    
                    <div className="relative z-10 w-[95vw] max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-300">
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
          <div className="w-[28vw] min-w-[340px] max-w-[480px] overflow-hidden">
            <div className="bg-white p-4 rounded-xl shadow-lg w-full">
              {/* язык + logout */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={openProfileModal}
                    className="inline-flex items-center bg-white text-black rounded-full px-4 py-2 shadow border hover:bg-gray-50 active:scale-[.98] whitespace-nowrap text-xs"
                  >
                    <User className="w-4 h-4 mr-1" />
                    {t('ui.profile')}
                  </button>
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
                  <button
                    onClick={() => (showFavoritesList ? setShowFavoritesList(false) : openFavorites())}
                    className={`p-2 rounded-full border ${showFavoritesList ? 'bg-pink-100' : 'bg-white'}`}
                    title={t('ui.favorites')}
                  >
                    <Heart className="w-5 h-5 text-pink-600" />
                  </button>
                  {/* 🆕 кнопка очистки */}
                  <button
                    onClick={handleClearStorage}
                    title="Clear local storage"
                    className="text-gray-500 hover:text-red-500 transition p-1"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>

              {/* даты */}
              <div className="mt-3">
                <label className="block text-xs text-gray-600 z-50 font-semibold mb-1">
                  {t('Select Dates')}
                </label>

                <div className="flex gap-2">
                  <DatePicker
                    selected={start}
                    onChange={(date: Date | null) =>
                      setDateRange([{ ...dateRange[0], startDate: date }])
                    }
                    selectsStart
                    startDate={start ?? undefined}
                    endDate={end ?? undefined}
                    placeholderText={t('Start of period')}
                    dateFormat="dd.MM.yyyy"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                    calendarClassName="dp-sm"
                    popperClassName="dp-sm"
                  />

                  <DatePicker
                    selected={end}
                    onChange={(date: Date | null) =>
                      setDateRange([{ ...dateRange[0], endDate: date }])
                    }
                    selectsEnd
                    startDate={start ?? undefined}
                    endDate={end ?? undefined}
                    minDate={start ?? undefined}
                    placeholderText={t('End of period')}
                    dateFormat="dd.MM.yyyy"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                    calendarClassName="dp-sm"
                    popperClassName="dp-sm"
                  />
                </div>

                {start && end && (
                  <div className="mt-2">
                    <div className="inline-flex items-center bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      <span>
                        {formatDate(start.toISOString())} - {formatDate(end.toISOString())}
                      </span>
                      <button
                        onClick={() =>
                          setDateRange([{ startDate: null, endDate: null, key: 'selection' }])
                        }
                        className="ml-2 text-gray-600 hover:text-gray-600"
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

              {/* ФИЛЬТРЫ — тут же, внутри панели */}
              <div className="bg-white p-0 rounded-lg w-full mt-3">
                <button
                  type="button"
                  onClick={() => setShowFilters((s) => !s)}
                  className="w-full bg-gr-200 text-gray-800 font-semibold text-sm py-2 px-3 rounded shadow flex justify-between items-center"
                  aria-expanded={showFilters}
                >
                  {t('filters.header')} <span>{showFilters ? '▲' : '▼'}</span>
                </button>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="bg-white text-red-600 border border-red-300 text-xs px-3 py-1 rounded-full hover:bg-red-50"
                  >
                    {t('filters.reset')}
                  </button>
                </div>

                {showFilters && (
                  <div className="mt-2 bg-gray-100 p-3 rounded shadow space-y-3 max-h-[50vh] overflow-auto w-full">
                    <h3 className="text-sm font-bold text-gray-800">{t('filters.theme')}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.keys(markerColors).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleCheckboxChange(setFilterType, type)}
                          className={`px-3 py-1 rounded-full border text-xs font-small transition
                            ${filterType.includes(type)
                              ? 'bg-green-200 text-black'
                              : 'bg-white text-black'}
                            active:scale-95`}
                        >
                          {translateTypeUI(type)}
                        </button>
                      ))}
                    </div>

                    <p className="text-sm font-bold text-gray-800">{t('filters.for')}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {['any', 'children', 'adults'].map((format) => {
                        const isSelected = filterFormat.includes(format);
                        return (
                          <button
                            key={format}
                            type="button"
                            onClick={() => handleCheckboxChange(setFilterFormat, format)}
                            className={`px-3 py-1 text-xs font-small rounded-full border transition
                              ${isSelected ? 'bg-green-200 text-black' : 'bg-white text-black'}
                              hover:bg-green-100 active:scale-95`}
                          >
                            {t(`filters.${format}`)}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-sm font-bold text-gray-800">{t('filters.age')}</p>
                    <div className="flex flex-wrap gap-2">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ВЕРХНИЕ КНОПКИ */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[96vw] md:w-[84vw] xl:w-[1200px]">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2">
            <button
              onClick={() => (showEventList ? setShowEventList(false) : openEventList())}
              className="inline-flex items-center bg-white text-black rounded-full px-4 py-2 shadow border hover:bg-gray-50 active:scale-[.98] whitespace-nowrap text-xs"
              aria-label={showEventList ? t('ui.hideList') : t('ui.showList')}
              title={showEventList ? t('ui.hideList') : t('ui.showList')}
            >
              {showEventList ? t('ui.hideList') : '📋 ' + t('ui.showList')}
            </button>
            <Link href="/add-event" className="inline-flex items-center bg-white text-black rounded-full px-4 py-2 shadow border hover:bg-gray-50 active:scale-[.98] whitespace-nowrap text-xs">
              {t('ui.addEvent')}
            </Link>

            <button
              onClick={() => setShowFeedbackModal(true)}
              className="inline-flex items-center bg-white text-black rounded-full px-4 py-2 shadow border hover:bg-gray-50 active:scale-[.98] whitespace-nowrap text-xs"
            >
              {t('ui.feedback')}
            </button>

            <Link href="/privacy" className="inline-flex items-center bg-white text-black rounded-full px-4 py-2 shadow border hover:bg-gray-50 active:scale-[.98] whitespace-nowrap text-xs">
              {t('ui.privacy')}
            </Link>
          </div>
        </div>

        {/* СПИСОК СПРАВА */}
        {showEventList && (
          <div
            ref={listRef}
            className="absolute top-0 bottom-0 right-0 w-[30vw] z-40 bg-white bg-opacity-95 overflow-y-auto p-4 shadow-2xl"
          >
            {filteredByView.slice(0, visibleCount).map((event) => {
              const isSelected = selectedEvent === event.id;
              return (
                <div
                id={`event-${event.id}`}
                key={event.id}
                onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                className={`mb-6 p-4 rounded-lg transition-colors duration-200 cursor-pointer ${
                    isSelected ? 'bg-yellow-100 border-yellow-400 shadow-lg' : 'bg-white border border-gray-200 shadow'
                }`}
                >
                    {/* Шапка: заголовок + сердечко справа */}
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>

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
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-800 mb-1">{getDescription(event)}</p>
                  <p className="text-sm text-gray-600 mb-1">📍 {event.address}</p>
                  <p className="text-sm text-gray-600 mb-1">
                    🕒 {formatDate(event.start_date)} – {formatDate(event.end_date)} {formatTime(event.start_time)} – {formatTime(event.end_time)}
                  </p>
                  {event.website && (
                    <p className="text-sm text-blue-600">
                      <a href={event.website} target="_blank" rel="noopener noreferrer">🔗 {formatWebsite(event.website)}</a>
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => shareEvent(event)}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 border border-gray-300 hover:bg-gray-200"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </button>

                    <button
                      onClick={() => downloadICS(makeICS(event), `${(event.title || 'event').replace(/[^\w\-]+/g,'_')}.ics`)}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 border border-gray-300 hover:bg-gray-200"
                    >
                      <CalendarPlus className="w-5 h-5 text-gray-600" />
                    </button>

                    <a
                      href={makeGoogleCalendarUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 border border-gray-300 hover:bg-gray-200"
                    >
                      <CalendarDays className="w-5 h-5 text-gray-600" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
}

export default DesktopOverlay;