import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

export function useRealtimeLogs(callback) {
  useEffect(() => {
    const channel = supabase
      .channel('attack-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attack_logs' }, payload => {
        callback?.(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [callback]);
}

export function useRealtimeTraffic() {
  const [latestReq, setLatest] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('traffic-stream')
      .on('broadcast', { event: 'request' }, payload => {
        setLatest(payload.payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return latestReq;
}

export function useRealtimeAlerts(callback) {
  useEffect(() => {
    const channel = supabase
      .channel('waf-alerts')
      .on('broadcast', { event: 'alert' }, payload => {
        callback?.(payload.payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [callback]);
}
