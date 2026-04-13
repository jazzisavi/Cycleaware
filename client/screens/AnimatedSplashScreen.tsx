import React, { useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { FontFamily } from "@/constants/theme";

import splashLogo from "../../assets/images/splash-logo.png";

const TAGLINE = "Sinct to your cycle";

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: AnimatedSplashScreenProps) {
  const rotation = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });

    rotation.value = withDelay(
      200,
      withTiming(360, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );

    wordOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));

    const timeout = setTimeout(() => {
      onFinish();
    }, 1400);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const wordAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image source={splashLogo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <View style={styles.textContainer}>
          <View style={styles.headlineRow}>
            <Animated.Text style={[styles.boldWord, wordAnimatedStyle]}>
              HRT.
            </Animated.Text>
          </View>
          <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
            {TAGLINE}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDE8E2",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: "center",
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  boldWord: {
    fontFamily: FontFamily.serifBold,
    fontSize: 28,
    color: "#FFFFFF",
  },
  tagline: {
    fontFamily: FontFamily.serifBold,
    fontSize: 28,
    color: "#2C2118",
    marginTop: 2,
  },
});
