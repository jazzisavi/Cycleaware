import { useState, useEffect, useCallback } from 'react';
import { LocalDatabase, LocalReminder, LocalHistoryEntry } from '@/services/LocalDatabase';

export function useLocalReminders() {
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    const data = LocalDatabase.getAllReminders();
    setReminders(data);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    LocalDatabase.initDatabase();
    refresh();
    LocalDatabase.subscribe(refresh);
    return () => {
      LocalDatabase.unsubscribe(refresh);
    };
  }, [refresh]);

  return { reminders, isLoaded, refresh };
}

export function useLocalReminder(id: string | undefined) {
  const [reminder, setReminder] = useState<LocalReminder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    if (id) {
      const data = LocalDatabase.getReminder(id);
      setReminder(data);
      setIsLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      LocalDatabase.initDatabase();
      refresh();
      LocalDatabase.subscribe(refresh);
      return () => {
        LocalDatabase.unsubscribe(refresh);
      };
    }
  }, [id, refresh]);

  return { reminder, isLoaded, refresh };
}

export function useLocalHistory() {
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    const data = LocalDatabase.getHistory();
    setHistory(data);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    LocalDatabase.initDatabase();
    refresh();
    LocalDatabase.subscribe(refresh);
    return () => {
      LocalDatabase.unsubscribe(refresh);
    };
  }, [refresh]);

  return { history, isLoaded, refresh };
}
