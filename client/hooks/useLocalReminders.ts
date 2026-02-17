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
  }, [refresh]);

  return { reminders, isLoaded, refresh };
}

export function useLocalReminder(id: string | undefined) {
  const [reminder, setReminder] = useState<LocalReminder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      LocalDatabase.initDatabase();
      const data = LocalDatabase.getReminder(id);
      setReminder(data);
      setIsLoaded(true);
    }
  }, [id]);

  return { reminder, isLoaded };
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
  }, [refresh]);

  return { history, isLoaded, refresh };
}
