'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase/client';
import { SearchIcon } from 'lucide-react';

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

export default function SearchPrompt() {
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
        <div className="pointer-events-auto animate-fade-in-out animate-sway bg-white/90 backdrop-blur-md shadow-xl rounded-full px-5 py-2 flex items-center gap-2 text-sm text-gray-800">
            <SearchIcon size={16} className="text-gray-500" />
            <span className="font-medium">{t('searchprompt.hit')}</span>
            <span className="hidden sm:inline">{t('searchprompt.try')}:</span>
            <span className="font-semibold whitespace-nowrap">{promptText}</span>
        </div>
    </div>
  );
}
