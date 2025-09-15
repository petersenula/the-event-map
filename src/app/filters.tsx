'use client';

import { useMemo } from 'react';

type DateRangeValue = {
  startDate: Date | null;
  endDate: Date | null;
};

type FiltersProps = {
  dateRange: DateRangeValue;
  setDateRange: (v: DateRangeValue) => void;

  filterType: string | null;
  setFilterType: (v: string | null) => void;

  filterFormat: string | null;
  setFilterFormat: (v: string | null) => void;

  filterAge: string | null;
  setFilterAge: (v: string | null) => void;

  filterPrice: string | null;
  setFilterPrice: (v: string | null) => void;

  events: Array<Record<string, unknown>>;
  setFilteredEvents: (e: Array<Record<string, unknown>>) => void;

  // переводчик из react-i18next
  t: (key: string) => string;
};

export default function Filters({
  dateRange,
  setDateRange,
  filterType,
  setFilterType,
  filterFormat,
  setFilterFormat,
  filterAge,
  setFilterAge,
  filterPrice,
  setFilterPrice,
  events,
  setFilteredEvents,
  t,
}: FiltersProps) {
  // пока просто прокидываем events без реальной фильтрации, чтобы сборка прошла
  useMemo(() => {
    setFilteredEvents(events);
  }, [events, setFilteredEvents]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={filterType ?? ''}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="border rounded p-2"
        >
          <option value="">{t('filters.type_all') || 'All types'}</option>
          {/* TODO: добавь реальные опции */}
        </select>

        <select
          value={filterFormat ?? ''}
          onChange={(e) => setFilterFormat(e.target.value || null)}
          className="border rounded p-2"
        >
          <option value="">{t('filters.format_all') || 'All formats'}</option>
        </select>

        <select
          value={filterAge ?? ''}
          onChange={(e) => setFilterAge(e.target.value || null)}
          className="border rounded p-2"
        >
          <option value="">{t('filters.age_all') || 'All ages'}</option>
        </select>

        <select
          value={filterPrice ?? ''}
          onChange={(e) => setFilterPrice(e.target.value || null)}
          className="border rounded p-2"
        >
          <option value="">{t('filters.price_all') || 'Any price'}</option>
        </select>
      </div>

      {/* Заглушка для выбора дат — вставишь свой DateRange позже */}
      <div className="text-sm opacity-70">
        {t('filters.date_placeholder') || 'Date filter UI goes here'}
        <div className="mt-1 text-xs">
          {dateRange.startDate?.toDateString() || '—'} —{' '}
          {dateRange.endDate?.toDateString() || '—'}
        </div>
        <button
          type="button"
          className="mt-2 border rounded px-3 py-1"
          onClick={() =>
            setDateRange({ startDate: null, endDate: null })
          }
        >
          {t('filters.clear_dates') || 'Clear dates'}
        </button>
      </div>
    </div>
  );
}
