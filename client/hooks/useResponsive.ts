import { useWindowDimensions } from "react-native";

const SMALL_HEIGHT_THRESHOLD = 700;
const SCALE_FACTOR = 0.85;

export function useResponsive() {
  const { height } = useWindowDimensions();
  const isSmallScreen = height < SMALL_HEIGHT_THRESHOLD;
  const factor = isSmallScreen ? SCALE_FACTOR : 1;

  const rs = (value: number, floor = 0): number => {
    const scaled = Math.round(value * factor);
    return floor > 0 ? Math.max(scaled, floor) : scaled;
  };

  return { rs, isSmallScreen };
}
