import { useEffect } from 'react';
import { globalEventBus } from '../utils/EventBus';

export function useEventBus(event, callback) {
  useEffect(() => {
    const unsubscribe = globalEventBus.on(event, callback);
    return () => unsubscribe();
  }, [event, callback]);
}

