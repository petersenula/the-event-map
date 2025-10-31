'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase/client';
import { SearchIcon } from 'lucide-react';
import { useRef } from 'react';

interface SearchPromptProps {
  coords?: { top: number; left: number };
}

type Prompt = {
  id: string;
  start_date: string;
  end_date: string;
  text_en: string;
  text_ru: string;
  text_de: string;
  text_fr: string;
  text_it: string;
};

export default function SearchPrompt({ coords }: SearchPromptProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [visible, setVisible] = useState(false);
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const alreadySeen = localStorage.getItem('search_prompt_shown');
    if (alreadySeen === 'true') return;

    const fetchPrompt = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('search_prompts')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      setPrompt(data);

      // Показать через 5 секунд
      setTimeout(() => {
        setVisible(true);
        localStorage.setItem('search_prompt_shown', 'true');

        // Скрыть через 6 сек после показа
        setTimeout(() => setVisible(false), 6000);
      }, 5000);
    };

    fetchPrompt();
  }, []);

  if (!visible || !prompt) return null;

  const lang = i18n.language.split('-')[0];
  const promptText =
    prompt[`text_${lang}` as keyof Prompt] || prompt.text_en;

   if (!visible || !prompt || !coords) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: coords.top - 5, // чуть выше поля
        left: coords.left,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="pointer-events-auto animate-fade-in-out animate-sway 
                      bg-yellow-200 text-black rounded-2xl shadow-2xl 
                      px-6 py-4 text-lg font-semibold 
                      flex items-center gap-3 backdrop-blur-sm border border-yellow-400">
        <SearchIcon size={20} className="text-yellow-700" />
        <span className="whitespace-nowrap">{t('searchprompt.hit')}</span>
        <span className="whitespace-nowrap">{t('searchprompt.try')}</span>
        <SearchIcon size={20} className="text-yellow-700" />
        <span className="font-bold whitespace-nowrap">{promptText}</span>
      </div>
    </div>
  );
}
