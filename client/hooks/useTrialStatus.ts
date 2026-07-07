import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_START_KEY = "@orbia/trial_start_date";
const DEV_OVERRIDE_KEY = "@orbia/dev_trial_override";
const TRIAL_DURATION_DAYS = 30;

export interface TrialStatus {
  isInTrial: boolean;
  daysLeft: number;
  trialExpired: boolean;
  trialStartDate: Date | null;
  refreshTrial: () => Promise<void>;
}

interface CachedTrialStatus {
  isInTrial: boolean;
  daysLeft: number;
  trialExpired: boolean;
  trialStartDate: Date | null;
}

let cachedStatus: CachedTrialStatus = {
  isInTrial: false,
  daysLeft: 0,
  trialExpired: false,
  trialStartDate: null,
};

export function useTrialStatus(): TrialStatus {
  const [isInTrial, setIsInTrial] = useState(cachedStatus.isInTrial);
  const [daysLeft, setDaysLeft] = useState(cachedStatus.daysLeft);
  const [trialExpired, setTrialExpired] = useState(cachedStatus.trialExpired);
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(cachedStatus.trialStartDate);

  const applyStatus = useCallback((next: CachedTrialStatus) => {
    cachedStatus = next;
    setIsInTrial(next.isInTrial);
    setDaysLeft(next.daysLeft);
    setTrialExpired(next.trialExpired);
    setTrialStartDate(next.trialStartDate);
  }, []);

  const computeStatus = useCallback(async () => {
    try {
      const startStr = await AsyncStorage.getItem(TRIAL_START_KEY);
      if (!startStr) {
        applyStatus({ isInTrial: false, daysLeft: 0, trialExpired: false, trialStartDate: null });
        return;
      }

      const start = new Date(startStr);
      let effectiveDaysLeft: number;

      const override = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
      if (override !== null) {
        const parsed = parseInt(override, 10);
        if (!isNaN(parsed)) {
          effectiveDaysLeft = Math.min(TRIAL_DURATION_DAYS, parsed);
          applyStatus({
            isInTrial: effectiveDaysLeft > 0,
            daysLeft: effectiveDaysLeft,
            trialExpired: effectiveDaysLeft <= 0,
            trialStartDate: start,
          });
          return;
        }
      }

      const now = new Date();
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      const nowDay = new Date(now);
      nowDay.setHours(0, 0, 0, 0);
      const elapsed = Math.floor((nowDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
      effectiveDaysLeft = Math.min(TRIAL_DURATION_DAYS, TRIAL_DURATION_DAYS - elapsed);

      applyStatus({
        isInTrial: effectiveDaysLeft > 0,
        daysLeft: effectiveDaysLeft,
        trialExpired: effectiveDaysLeft <= 0,
        trialStartDate: start,
      });
    } catch {
      applyStatus({ isInTrial: false, daysLeft: 0, trialExpired: false, trialStartDate: null });
    }
  }, [applyStatus]);

  useEffect(() => {
    computeStatus();
  }, [computeStatus]);

  return { isInTrial, daysLeft, trialExpired, trialStartDate, refreshTrial: computeStatus };
}
