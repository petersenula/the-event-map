'use client';

import { useEffect, useMemo, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

type Lang = 'en' | 'de' | 'fr' | 'it' | 'ru';

/** Тексты тура на 5 языках. EN — дефолт */
const copy: Record<Lang, {
  welcomeTitle: string;
  welcomeText: string;
  next: string; back: string; skip: string; done: string; close: string;
  steps: {
    filtersTitle: string; filtersText: string;
    calendarTitle: string; calendarText: string;
    searchTitle: string; searchText: string;
    favTitle: string; favText: string;
    calAddTitle: string; calAddText: string;
    shareTitle: string; shareText: string;
    finishTitle: string; finishText: string;
  }
}> = {
  en: {
    welcomeTitle: 'Welcome to Event Map Switzerland 👋',
    welcomeText:
      'All the most interesting events across Switzerland – concerts, festivals, exhibitions, workshops. In 10 seconds we’ll show you how to find “your” events.',
    next: 'Next', back: 'Back', skip: 'Skip', done: 'Done', close: 'Close',
    steps: {
      filtersTitle: 'Filters',
      filtersText: 'Pick theme, format or for whom – get a personalized list instantly.',
      calendarTitle: 'Calendar',
      calendarText: 'Choose a period: today, weekend or next week.',
      searchTitle: 'Search',
      searchText: 'Type a keyword: “concert”, “kids”, “Basel”…',
      favTitle: 'Favorites',
      favText: 'Tap the heart to save an event so you don’t lose it.',
      calAddTitle: 'Add to calendar',
      calAddText: 'Send an event to your calendar and get a reminder.',
      shareTitle: 'Share',
      shareText: 'Share the link with friends – plan together.',
      finishTitle: 'All set!',
      finishText: 'Start with filters or calendar — it’s the fastest way.',
    },
  },
  de: {
    welcomeTitle: 'Willkommen bei Event Map Switzerland 👋',
    welcomeText:
      'Die spannendsten Events in der ganzen Schweiz – Konzerte, Festivals, Ausstellungen, Workshops. In 10 Sekunden zeigen wir dir, wie du „deine“ Events findest.',
    next: 'Weiter', back: 'Zurück', skip: 'Überspringen', done: 'Fertig', close: 'Schliessen',
    steps: {
      filtersTitle: 'Filter',
      filtersText: 'Wähle Thema, Format oder für wen – sofort personalisierte Treffer.',
      calendarTitle: 'Kalender',
      calendarText: 'Zeitraum wählen: heute, Wochenende oder nächste Woche.',
      searchTitle: 'Suche',
      searchText: 'Gib ein Stichwort ein: „Konzert“, „Kinder“, „Basel“…',
      favTitle: 'Favoriten',
      favText: 'Tippe auf das Herz, um ein Event zu speichern.',
      calAddTitle: 'Zum Kalender hinzufügen',
      calAddText: 'Sende das Event in deinen Kalender und erhalte eine Erinnerung.',
      shareTitle: 'Teilen',
      shareText: 'Teile den Link mit Freunden – gemeinsam planen.',
      finishTitle: 'Fertig!',
      finishText: 'Starte mit Filtern oder Kalender — am schnellsten.',
    },
  },
  fr: {
    welcomeTitle: 'Bienvenue sur Event Map Switzerland 👋',
    welcomeText:
      'Tous les événements les plus intéressants en Suisse – concerts, festivals, expositions, ateliers. En 10 secondes, on vous montre comment trouver « vos » événements.',
    next: 'Suivant', back: 'Précédent', skip: 'Passer', done: 'Terminer', close: 'Fermer',
    steps: {
      filtersTitle: 'Filtres',
      filtersText: 'Choisissez un thème, un format ou pour qui – résultats personnalisés.',
      calendarTitle: 'Calendrier',
      calendarText: 'Choisissez une période : aujourd’hui, le week-end ou la semaine prochaine.',
      searchTitle: 'Recherche',
      searchText: 'Tapez un mot-clé : « concert », « enfants », « Bâle »…',
      favTitle: 'Favoris',
      favText: 'Appuyez sur le cœur pour enregistrer un événement.',
      calAddTitle: 'Ajouter au calendrier',
      calAddText: 'Envoyez l’événement dans votre calendrier et recevez un rappel.',
      shareTitle: 'Partager',
      shareText: 'Partagez le lien avec vos amis — planifiez ensemble.',
      finishTitle: 'C’est parti !',
      finishText: 'Commencez par les filtres ou le calendrier — c’est le plus rapide.',
    },
  },
  it: {
    welcomeTitle: 'Benvenuto su Event Map Switzerland 👋',
    welcomeText:
      'Tutti gli eventi più interessanti in Svizzera – concerti, festival, mostre, workshop. In 10 secondi ti mostriamo come trovare quelli “giusti” per te.',
    next: 'Avanti', back: 'Indietro', skip: 'Salta', done: 'Fatto', close: 'Chiudi',
    steps: {
      filtersTitle: 'Filtri',
      filtersText: 'Scegli tema, formato o per chi — risultati personalizzati subito.',
      calendarTitle: 'Calendario',
      calendarText: 'Scegli periodo: oggi, weekend o prossima settimana.',
      searchTitle: 'Cerca',
      searchText: 'Inserisci una parola chiave: “concerto”, “bambini”, “Basilea”…',
      favTitle: 'Preferiti',
      favText: 'Tocca il cuore per salvare un evento.',
      calAddTitle: 'Aggiungi al calendario',
      calAddText: 'Invia l’evento al calendario e ricevi un promemoria.',
      shareTitle: 'Condividi',
      shareText: 'Condividi il link con gli amici — pianificate insieme.',
      finishTitle: 'Tutto pronto!',
      finishText: 'Inizia da filtri o calendario — è il più veloce.',
    },
  },
  ru: {
    welcomeTitle: 'Добро пожаловать на Event Map Switzerland 👋',
    welcomeText:
      'Все самые интересные события Швейцарии — концерты, фестивали, выставки, мастер-классы. За 10 секунд покажем, как находить «свои» события.',
    next: 'Далее', back: 'Назад', skip: 'Пропустить', done: 'Готово', close: 'Закрыть',
    steps: {
      filtersTitle: 'Фильтры',
      filtersText: 'Выберите тему, формат или для кого — получите персональную подборку.',
      calendarTitle: 'Календарь',
      calendarText: 'Задайте период: сегодня, выходные или следующая неделя.',
      searchTitle: 'Поиск',
      searchText: 'Введите ключевое слово: «concert», «kids», «Basel»…',
      favTitle: 'Избранное',
      favText: 'Нажмите на сердечко, чтобы сохранить событие.',
      calAddTitle: 'Добавить в календарь',
      calAddText: 'Отправьте событие в календарь и получите напоминание.',
      shareTitle: 'Поделиться',
      shareText: 'Поделитесь ссылкой с друзьями — планируйте вместе.',
      finishTitle: 'Готово!',
      finishText: 'Начните с фильтров или календаря — это быстрее всего.',
    },
  },
};

function detectLang(explicit?: Lang): Lang {
  if (explicit) return explicit;
  const fromLS = (typeof window !== 'undefined' && localStorage.getItem('lang')) as Lang | null;
  if (fromLS && copy[fromLS]) return fromLS;
  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement.lang?.slice(0, 2) as Lang;
    if (htmlLang && copy[htmlLang]) return htmlLang;
  }
  return 'en';
}

export default function OnboardingTour({ lang }: { lang?: Lang }) {
  const [run, setRun] = useState(false);
  const t = copy[detectLang(lang)];

  useEffect(() => {
    // небольшой delay, чтобы DOM оверлея гарантированно был на месте
    const seen = localStorage.getItem('tour_seen_v3');
    if (!seen) {
      const id = setTimeout(() => {
        setRun(true);
        localStorage.setItem('tour_seen_v3', 'true');
      }, 300);
      return () => clearTimeout(id);
    }
  }, []);

  const steps: Step[] = useMemo(() => [
    { target: 'body', placement: 'center', title: t.welcomeTitle, content: t.welcomeText, disableBeacon: true },
    { target: '[data-tour="filters"]',  title: t.steps.filtersTitle,  content: t.steps.filtersText,  placement: 'auto' },
    { target: '[data-tour="calendar"]', title: t.steps.calendarTitle, content: t.steps.calendarText, placement: 'auto' },
    { target: '[data-tour="search"]',   title: t.steps.searchTitle,   content: t.steps.searchText,   placement: 'auto' },
    { target: '[data-tour="favorite"]', title: t.steps.favTitle,      content: t.steps.favText,      placement: 'auto' },
    { target: '[data-tour="add-to-calendar"]', title: t.steps.calAddTitle, content: t.steps.calAddText, placement: 'auto' },
    { target: '[data-tour="share"]',    title: t.steps.shareTitle,    content: t.steps.shareText,    placement: 'auto' },
    { target: 'body', placement: 'center', title: t.steps.finishTitle, content: t.steps.finishText },
  ], [t]);

  const onCb = (data: CallBackProps) => {
    const finished = [STATUS.FINISHED, STATUS.SKIPPED].includes(data.status!);
    if (finished) setRun(false);
  };

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightPadding={8}
      spotlightClicks
      styles={{
        options: { zIndex: 9999, primaryColor: '#2563eb' },
        tooltipContainer: { textAlign: 'left' },
      }}
      locale={{ back: t.back, close: t.close, last: t.done, next: t.next, skip: t.skip }}
      callback={onCb}
    />
  );
}
