// src/lib/swUpdate.ts
'use client';

/**
 * Мягко обновляет сервис-воркер до последней версии и перезагружает страницу ОДИН РАЗ.
 * Работает и если SW ещё не зарегистрирован — просто сделает обычный reload.
 */
export async function forceUpdateToLatestCode(options?: { alsoClearCaches?: boolean }) {
  try {
    if (!('serviceWorker' in navigator)) {
      // Нет SW — просто перезагрузим страницу
      window.location.reload();
      return;
    }

    // по желанию очистим HTTP CacheStorage (не IndexedDB!)
    if (options?.alsoClearCaches && 'caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch {}
    }

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      // SW не найден — перезагружаем
      window.location.reload();
      return;
    }

    // помогаем браузеру “прислушаться” к новой версии
    await reg.update().catch(() => {});

    // Функция: дождаться, пока новый SW возьмёт контроль и затем перезагрузить
    const reloadOnceOnControllerChange = () =>
      new Promise<void>((resolve) => {
        let reloaded = false;
        const onChange = () => {
          if (!reloaded) {
            reloaded = true;
            navigator.serviceWorker.removeEventListener('controllerchange', onChange);
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', onChange, { once: true });
      });

    // Если есть “ждущий” воркер — просим его взять управление
    if (reg.waiting) {
      const waitReload = reloadOnceOnControllerChange();
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      await waitReload;
      window.location.reload();
      return;
    }

    // Если идёт установка новой версии — дождёмся install → installed
    if (reg.installing) {
      const installing = reg.installing;
      const statePromise = new Promise<void>((resolve) => {
        installing.addEventListener('statechange', async () => {
          if (installing.state === 'installed') {
            const waitReload = reloadOnceOnControllerChange();
            reg.waiting?.postMessage?.({ type: 'SKIP_WAITING' });
            await waitReload;
            resolve();
          }
        });
      });
      await statePromise;
      window.location.reload();
      return;
    }

    // На всякий случай: после update() мог появиться waiting
    if (reg.waiting) {
      const waitReload = reloadOnceOnControllerChange();
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      await waitReload;
      window.location.reload();
      return;
    }

    // Фолбэк: просто перезагрузим страницу
    window.location.reload();
  } catch {
    window.location.reload();
  }
}
