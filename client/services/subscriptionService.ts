import { Platform } from "react-native";
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PACKAGE_TYPE,
} from "react-native-purchases";

/**
 * Derive a "per month" price string from the yearly package (price / 12),
 * formatted in the store's currency. Returns null when no yearly package
 * or price is available, so callers can fall back to generic copy.
 */
export function getMonthlyEquivalentPriceString(
  offering: PurchasesOffering | null
): string | null {
  try {
    const yearly = offering?.availablePackages.find(
      (p) => p.packageType === PACKAGE_TYPE.ANNUAL
    );
    if (!yearly) return null;
    const price = yearly.product.price;
    if (!price || price <= 0) return null;
    const monthly = price / 12;
    const currencyCode = yearly.product.currencyCode;
    if (currencyCode) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currencyCode,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(monthly);
      } catch {}
    }
    // Fallback: reuse the currency symbol from the yearly price string.
    const symbol = (yearly.product.priceString || "").replace(/[\d.,\s]/g, "");
    if (!symbol) return null;
    const rounded = Math.round(monthly * 100) / 100;
    const numStr = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
    return `${symbol}${numStr}`;
  } catch {
    return null;
  }
}

const ENTITLEMENT_ID = "pro";

let isConfigured = false;

export async function initializeRevenueCat(): Promise<void> {
  if (isConfigured) return;
  if (Platform.OS === "web") return;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) {
    console.warn("RevenueCat API key not configured");
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    isConfigured = true;
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (Platform.OS === "web" || !isConfigured) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    console.error("Failed to get offerings:", error);
    return null;
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (Platform.OS === "web") {
    return { success: false, error: "Purchases not available on web" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive =
      typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
    return { success: isActive, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: error.message || "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (Platform.OS === "web") {
    return { success: false, error: "Purchases not available on web" };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive =
      typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
    return { success: isActive, customerInfo };
  } catch (error: any) {
    return { success: false, error: error.message || "Restore failed" };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === "web" || !isConfigured) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("Failed to get customer info:", error);
    return null;
  }
}

export function checkEntitlement(customerInfo: CustomerInfo): boolean {
  return (
    typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined"
  );
}
