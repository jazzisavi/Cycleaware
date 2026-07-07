import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import {
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import {
  initializeRevenueCat,
  getOfferings,
  purchasePackage as purchasePackageFn,
  restorePurchases as restorePurchasesFn,
  getCustomerInfo,
  checkEntitlement,
} from "@/services/subscriptionService";
import { useTrialStatus, TrialStatus } from "@/hooks/useTrialStatus";
import { cancelTrialNotifications } from "@/services/notifications";

type PlanType = "trial" | "monthly" | "yearly" | "none";

interface SubscriptionState {
  isSubscribed: boolean;
  currentPlan: PlanType;
  isLoading: boolean;
  offering: PurchasesOffering | null;
}

interface SubscriptionContextType extends SubscriptionState, TrialStatus {
  isPro: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    currentPlan: "trial",
    isLoading: true,
    offering: null,
  });

  const { isInTrial, daysLeft, trialExpired, trialStartDate, refreshTrial } = useTrialStatus();

  const isPro = state.isSubscribed || isInTrial;

  const refreshStatus = useCallback(async () => {
    if (Platform.OS === "web") {
      setState((prev) => ({ ...prev, isLoading: false, currentPlan: "trial" }));
      return;
    }

    try {
      const customerInfo = await getCustomerInfo();
      if (customerInfo) {
        const isActive = checkEntitlement(customerInfo);
        const activeEntitlement = customerInfo.entitlements.active["pro"];
        let plan: PlanType = "trial";
        if (isActive && activeEntitlement) {
          const periodType = activeEntitlement.periodType;
          if (periodType === "NORMAL" || periodType === "INTRO") {
            const productId = activeEntitlement.productIdentifier || "";
            plan = productId.includes("yearly") ? "yearly" : "monthly";
          } else if (periodType === "TRIAL") {
            plan = "trial";
          }
        }
        setState((prev) => ({
          ...prev,
          isSubscribed: isActive,
          currentPlan: isActive ? plan : "trial",
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await initializeRevenueCat();
      const [offering] = await Promise.all([getOfferings(), refreshStatus()]);
      setState((prev) => ({ ...prev, offering: offering ?? null }));
    };
    init();
  }, []);

  useEffect(() => {
    if (!trialExpired || state.isSubscribed) return;
    const enforceExpiry = async () => {
      try {
        const { LocalDatabase } = require("@/services/LocalDatabase");
        const { cancelPendingNotificationsForReminder } = require("@/services/notifications");
        const allReminders = LocalDatabase.getAllReminders();
        for (const reminder of allReminders) {
          if (reminder.reminderType === "cycle" && reminder.isActive) {
            await cancelPendingNotificationsForReminder(reminder.id);
          }
        }
      } catch {}
    };
    enforceExpiry();
  }, [trialExpired, state.isSubscribed]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      const result = await purchasePackageFn(pkg);
      if (result.success) {
        await refreshStatus();
        await refreshTrial();
        try { await cancelTrialNotifications(); } catch {}
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      return { success: result.success, error: result.error };
    },
    [refreshStatus, refreshTrial]
  );

  const restorePurchases = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    const result = await restorePurchasesFn();
    if (result.success) {
      await refreshStatus();
      await refreshTrial();
      try { await cancelTrialNotifications(); } catch {}
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
    return { success: result.success, error: result.error };
  }, [refreshStatus, refreshTrial]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        isInTrial,
        daysLeft,
        trialExpired,
        trialStartDate,
        refreshTrial,
        isPro,
        purchasePackage,
        restorePurchases,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}
