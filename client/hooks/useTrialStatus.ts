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

export function useTrialStatus(): TrialStatus {
  const [isInTrial, setIsInTrial] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);

  const computeStatus = useCallback(async () => {
    try {
      const startStr = await AsyncStorage.getItem(TRIAL_START_KEY);
      if (!startStr) {
        setIsInTrial(false);
        setDaysLeft(0);
        setTrialExpired(false);
        setTrialStartDate(null);
        return;
      }

      const start = new Date(startStr);
      setTrialStartDate(start);

      let effectiveDaysLeft: number;

      if (__DEV__) {
        const override = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
        if (override !== null) {
          const parsed = parseInt(override, 10);
          if (!isNaN(parsed)) {
            effectiveDaysLeft = Math.max(0, Math.min(TRIAL_DURATION_DAYS, parsed));
            setDaysLeft(effectiveDaysLeft);
            setIsInTrial(effectiveDaysLeft > 0);
            setTrialExpired(effectiveDaysLeft === 0);
            return;
          }
        }
      }

      const now = new Date();
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      const nowDay = new Date(now);
      nowDay.setHours(0, 0, 0, 0);
      const elapsed = Math.floor((nowDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
      effectiveDaysLeft = Math.max(0, Math.min(TRIAL_DURATION_DAYS, TRIAL_DURATION_DAYS - elapsed));

      setDaysLeft(effectiveDaysLeft);
      setIsInTrial(effectiveDaysLeft > 0);
      setTrialExpired(effectiveDaysLeft === 0);
    } catch {
      setIsInTrial(false);
      setDaysLeft(0);
      setTrialExpired(false);
      setTrialStartDate(null);
    }
  }, []);

  useEffect(() => {
    computeStatus();
  }, [computeStatus]);

  return { isInTrial, daysLeft, trialExpired, trialStartDate, refreshTrial: computeStatus };
}
