import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/* ══════════════════════════════════════════════════════════════
   useStorage — offline-first com sync Supabase
   - Lê/escreve no localStorage imediatamente (sem latência)
   - Sincroniza com Supabase em background quando online
   - Ao logar, puxa dados do servidor (merge: servidor ganha se
     updated_at for mais recente)
═══════════════════════════════════════════════════════════════ */

const LS_PREFIX = 'rfb_v1_';
const SYNC_DEBOUNCE_MS = 1500; // espera 1.5s após última escrita para sincronizar

// Fila de sync pendente (chaves que precisam ser enviadas ao Supabase)
const pendingSync = new Set();
let syncTimer = null;
let currentUserId = null;

// Atualiza user_id quando auth muda
supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id ?? null;
  if (currentUserId) {
    // Ao logar: puxar dados do Supabase e mesclar com localStorage
    pullAllFromSupabase(currentUserId);
  }
});

// Puxar todos os dados do Supabase para o localStorage
async function pullAllFromSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('key, value, updated_at')
      .eq('user_id', userId);

    if (error) { console.warn('Supabase pull error:', error.message); return; }

    data?.forEach(row => {
      const lsKey = LS_PREFIX + row.key;
      // Verifica se o dado local é mais recente
      const localMeta = localStorage.getItem(lsKey + '__meta');
      const localUpdated = localMeta ? JSON.parse(localMeta).updated_at : null;
      const serverUpdated = row.updated_at;
      // Servidor ganha se não houver dado local ou servidor for mais recente
      if (!localUpdated || serverUpdated > localUpdated) {
        localStorage.setItem(lsKey, JSON.stringify(row.value));
        localStorage.setItem(lsKey + '__meta', JSON.stringify({ updated_at: serverUpdated }));
      }
    });

    // Disparar evento para que hooks re-renderizem
    window.dispatchEvent(new Event('storage_pulled'));
  } catch (e) {
    console.warn('pullAllFromSupabase error:', e);
  }
}

// Enviar uma chave específica para o Supabase
async function pushToSupabase(key, value) {
  if (!currentUserId) return;
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: currentUserId, key, value, updated_at: now },
        { onConflict: 'user_id,key' }
      );
    if (error) {
      console.warn(`Supabase push error (${key}):`, error.message);
      pendingSync.add(key); // tenta de novo depois
    } else {
      localStorage.setItem(LS_PREFIX + key + '__meta', JSON.stringify({ updated_at: now }));
    }
  } catch (e) {
    console.warn('pushToSupabase error:', e);
    pendingSync.add(key);
  }
}

// Debounced flush da fila de sync
function scheduleSyncFlush() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (pendingSync.size === 0 || !currentUserId) return;
    const keys = [...pendingSync];
    pendingSync.clear();
    await Promise.all(keys.map(key => {
      try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        const value = raw ? JSON.parse(raw) : null;
        return pushToSupabase(key, value);
      } catch { return Promise.resolve(); }
    }));
  }, SYNC_DEBOUNCE_MS);
}

/* ══════════════════════════════════════════════════════════════
   Hook principal
═══════════════════════════════════════════════════════════════ */
export function useStorage(key, defaultValue) {
  const lsKey = LS_PREFIX + key;

  const read = useCallback(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [lsKey, defaultValue]);

  const [value, setValue] = useState(read);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Re-ler quando o Supabase puxar dados novos
  useEffect(() => {
    const handler = () => setValue(read());
    window.addEventListener('storage_pulled', handler);
    window.addEventListener('storage', (e) => {
      if (e.key === lsKey) setValue(read());
    });
    return () => {
      window.removeEventListener('storage_pulled', handler);
    };
  }, [lsKey, read]);

  const set = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(lsKey, JSON.stringify(next));
        // Agendar sync com Supabase
        pendingSync.add(key);
        scheduleSyncFlush();
      } catch (e) {
        console.warn('localStorage write error:', e);
      }
      return next;
    });
  }, [lsKey, key]);

  return [value, set];
}

/* ══════════════════════════════════════════════════════════════
   useTrackerStorage — igual ao anterior, mas com prefixo diferente
═══════════════════════════════════════════════════════════════ */
const TRACKER_KEY = 'rfb_tracker_v1_checked';

export function useTrackerStorage() {
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(TRACKER_KEY) || '{}');
    } catch { return {}; }
  };

  const [checked, setCheckedState] = useState(read);

  useEffect(() => {
    const handler = () => setCheckedState(read());
    window.addEventListener('storage_pulled', handler);
    return () => window.removeEventListener('storage_pulled', handler);
  }, []);

  const setChecked = useCallback((updater) => {
    setCheckedState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(TRACKER_KEY, JSON.stringify(next));
      // Sync tracker também
      pendingSync.add('tracker_checked');
      if (currentUserId) {
        scheduleSyncFlush();
        // Para o tracker usamos uma chave especial
        pushToSupabase('tracker_checked', next);
      }
      return next;
    });
  }, []);

  return { checked, setChecked };
}

/* ══════════════════════════════════════════════════════════════
   Exportar função de sync manual (para uso no Login)
═══════════════════════════════════════════════════════════════ */
export { pullAllFromSupabase };
