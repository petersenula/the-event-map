'use client';

import React, { createContext, useContext, useState } from 'react';

type EventContextType = {
  eventIdFromUrl: string | null;
  setEventIdFromUrl: (id: string | null) => void;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [eventIdFromUrl, setEventIdFromUrl] = useState<string | null>(null);

  return (
    <EventContext.Provider value={{ eventIdFromUrl, setEventIdFromUrl }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEventFromUrl = (): EventContextType => {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEventFromUrl must be used within EventProvider');
  return context;
};
