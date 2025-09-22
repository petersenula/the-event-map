const waitForReadyMapAndBoundsAndSession = async (): Promise<google.maps.LatLngBounds | null> => {
    // 1. ⏳ Ждём восстановления сессии
    let tries = 0;
    const maxSessionTries = 10;
    const sessionDelay = 300;

    while (tries < maxSessionTries) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session || tries === maxSessionTries - 1) {
        if (session) {
          console.log('[waitForReadyMapAndBoundsAndSession] сессия восстановлена');
        } else {
          console.warn('[waitForReadyMapAndBoundsAndSession] сессия не восстановлена, продолжаем без неё');
        }
        break;
      }

      console.log(`[waitForReadyMapAndBoundsAndSession] сессия не восстановлена, попытка ${tries + 1}`);
      await new Promise((r) => setTimeout(r, sessionDelay));
      tries++;
    }

    // 2. ⏳ Ждём карту и границы
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 50 * 200ms = 10 секунд

      const tryGetBounds = () => {
        if (!mapReady || !mapRef.current) {
          console.log('[waitForReadyMapAndBoundsAndSession] карта ещё не готова, повтор через 200мс');
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn('[waitForReadyMapAndBoundsAndSession] карта так и не готова, отмена');
            resolve(null);
            return;
          }
          setTimeout(tryGetBounds, 200);
          return;
        }

        const currentBounds = mapRef.current.getBounds?.();
        if (!currentBounds) {
          console.log('[waitForReadyMapAndBoundsAndSession] границы ещё не готовы, повтор через 200мс');
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn('[waitForReadyMapAndBoundsAndSession] границы так и не появились, отмена');
            resolve(null);
            return;
          }
          setTimeout(tryGetBounds, 200);
          return;
        }

        console.log('[waitForReadyMapAndBoundsAndSession] карта и границы готовы');
        resolve(currentBounds);
      };

      tryGetBounds();
    });
  };


    const handleMapSoftReload = () => {
      const center = mapRef.current?.getCenter?.()?.toJSON?.();
      const zoom = mapRef.current?.getZoom?.();
      if (center && zoom !== undefined) {
        localStorage.setItem('map_reload_center', JSON.stringify(center));
        localStorage.setItem('map_reload_zoom', zoom.toString());
        localStorage.setItem('map_reload_triggered', 'true'); // ⚠️ чтобы понять, что был soft reload
      }
      window.location.reload();
    };

     const [showing, setShowing] = useState<'all'|'viewed'|'favorites'>('all');

         // ⚠️ Оставляю твои вспомогательные функции как были (верхнего уровня):
       const handleEmailSignIn = async () => {
         const email = prompt(t('auth.enter_email'));
         if (email) {
           const { error } = await supabase.auth.signInWithOtp({ email });
           if (error) {
             alert(t('auth.email_error') + ': ' + error.message);
           } else {
             alert(t('auth.email_sent'));
           }
         }
       };
     
       const handleSmsSignIn = async () => {
         const phone = prompt(t('auth.enter_phone'))?.trim();
         if (!phone) { alert(t('auth.enter_phone')); return; }
         const { error } = await supabase.auth.signInWithOtp({ phone });
         if (error) {
           alert(t('auth.sms_error') + ': ' + error.message);
         } else {
           setSmsSent(true);
           setSmsCode('');
         }
       };
     
       const verifySmsCode = async () => {
         const phone = prompt(t('auth.enter_phone_again'));
         const token = prompt(t('auth.enter_sms_code'));
         if (phone && token) {
           const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
           if (error) {
             alert(t('auth.code_error') + ': ' + error.message);
           } else {
             alert(t('auth.logged_in'));
           }
         }
       };

         const handleFeedbackSubmit = async () => {
           if (!fbMessage.trim()) { setFbError(t('feedback.message_required')); return; }
           setFbSending(true);
           setFbError(null);
           try {
             // ✅ Берём свежую сессию прямо сейчас (устраняет гонку на десктопе)
             const { data: { session: fresh }, error: sErr } = await supabase.auth.getSession();
             if (sErr) console.warn('getSession error:', sErr);
             const userId = fresh?.user?.id ?? session?.user?.id ?? null;
       
             const { error } = await supabase
               .from('feedback')
               .insert([{
                 user_id: userId,
                 name: fbName.trim() || null,
                 email: fbEmail.trim() || null,
                 message: fbMessage.trim(),
               }]);
       
             if (error) {
               console.error('feedback insert error:', error);
               throw error;
             }
       
             setFbSuccess(true);
             setFbName(''); setFbEmail(''); setFbMessage('');
             setTimeout(() => { setShowFeedbackModal(false); setFbSuccess(false); }, 2000);
           } catch (e: any) {
             setFbError(e.message || t('feedback.error'));
           } finally {
             setFbSending(false);
           }
         };

           // helpers
           const translateTypeLocal = (type: string) => {
             const key = typeTranslationKeys[type as keyof typeof typeTranslationKeys];
             if (key) {
               const translated = t(key);
               if (translated && translated !== key) return translated;
             }
             return type;
           };
         
           const saveUserToProfiles = async (user: any) => {
             const { data: existingProfile } = await supabase
               .from('profiles')
               .select('*').eq('id', user.id).single();
             if (!existingProfile) {
               await supabase.from('profiles').insert({
                 id: user.id, email: user.email, phone: user.phone,
                 name: user.user_metadata?.name || '',
                 language: i18n.language, is_subscribed: false,
                 created_at: new Date().toISOString()
               });
             }
           };

             const DateFilterTag = () => {
    if (!dateRange[0].startDate || !dateRange[0].endDate) return null;
    const formattedStart = formatDate(dateRange[0].startDate.toISOString());
    const formattedEnd = formatDate(dateRange[0].endDate.toISOString());
    return (
      <div className="flex items-center bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full">
        <span>{formattedStart} - {formattedEnd}</span>
        <button
          onClick={() => setDateRange([{ startDate: null, endDate: null, key: 'selection' }])}
          className="ml-2 text-gray-600 hover:text-gray-800"
        >✕</button>
      </div>
    );
  };

    const handleCheckboxChange = (
    setFilter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setFilter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v: string) => v !== value) : [...prev, value]
    );
  };

    // 2) ОДНА функция (типизирована)
  const getComputedColor = (colorName?: string): string => {
    if (!colorName) return '#999999';
    const normalized = colorName.trim().toLowerCase() as ColorName;
    return colorMap[normalized] ?? '#999999';
  };

    const getCurrentLocale = () => {
    const lang = i18n.language;
    const match = availableLanguages.find(l => l.code === lang);
    return match?.locale || ru;
  };

  const mapClickHandler = () => { setSelectedEvent(null); };

    const handleSmsSend = async () => {
    setSmsError(null);
    if (!phone.trim()) { setSmsError(t('auth.phone_required')); return; }
    try {
      setSmsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
      if (error) throw error;
      setSmsStep('enter_code');
    } catch (e: any) {
      setSmsError(e.message || t('auth.sms_error'));
    } finally {
      setSmsLoading(false);
    }
  };

  const handleVerifySms = async () => {
    if (!phone || !smsCode) return;
    const { error } = await supabase.auth.verifyOtp({ phone, token: smsCode, type: 'sms' });
    if (error) {
      alert(t('auth.code_error') + ': ' + error.message);
    } else {
      setPhone(''); setSmsCode(''); setSmsSent(false);
      setShowAuthPrompt(false); setViewCount(0);
    }
  };

    const saveFavoritesToProfile = async (userId: string, favs: string[]) => {
      const unique = Array.from(new Set(favs.map(String)));
      console.log('[SAVE]', unique);
  
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            favorites: unique, // ← напрямую массив, без join
          },
          { onConflict: 'id' }
        );
  
      if (error) throw error;
      return unique;
    };
  
    // очистка: оставить только те избранные, которые реально есть в events
    const pruneFavoritesAgainstEvents = async (favs: FavoriteId[]) => {
      if (!favs.length) return favs;
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .in('id', favs);
      if (error) {
        console.warn('[favorites] prune check error:', error.message);
        return favs; // не ломаем UX, просто вернем как есть
      }
      const exist = new Set((data ?? []).map((r: any) => Number(r.id)));
      return favs.filter(id => exist.has(Number(id)));
    };