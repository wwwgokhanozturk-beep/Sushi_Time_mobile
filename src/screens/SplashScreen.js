import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';

// ─── Asset ────────────────────────────────────────────────────────────────────
const SPLASH_BG = require('../../assets/splash_bg.jpg');

// ─── Greeting sequence ────────────────────────────────────────────────────────
const GREETINGS = ['Hoş geldiniz', 'Welcome', 'Добро пожаловать'];

// ─── Timing constants (ms) ────────────────────────────────────────────────────
const INITIAL_DELAY    = 200;   // brief pause before first text appears
const FADE_IN_MS       = 400;   // opacity 0 → 1
const HOLD_MS          = 600;   // stays fully visible
const FADE_OUT_MS      = 400;   // opacity 1 → 0
const SCREEN_FADE_MS   = 500;   // whole-screen fade-out at the end
// Total: 200 + (400+600+400)×3 + 500 ≈ 4.9 s

// ─── Component ────────────────────────────────────────────────────────────────
export default function SplashScreen({ onFinish }) {
  const [greetingIdx, setGreetingIdx] = useState(0);

  // Individual text opacity (reused across greetings)
  const textOpacity   = useRef(new Animated.Value(0)).current;
  // Full-screen fade used for the exit transition
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    const runSequence = async () => {
      // Pre-load the bundled asset so the first render is instant
      try { await Asset.loadAsync(SPLASH_BG); } catch (_) { /* non-fatal */ }

      // Brief breathing room before the first greeting
      await delay(INITIAL_DELAY);

      // Animate each greeting in turn
      for (let i = 0; i < GREETINGS.length; i++) {
        if (!isMounted) return;

        setGreetingIdx(i);
        textOpacity.setValue(0);

        await animateSequence([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: FADE_IN_MS,
            useNativeDriver: true,
          }),
          Animated.delay(HOLD_MS),
          Animated.timing(textOpacity, {
            toValue: 0,
            duration: FADE_OUT_MS,
            useNativeDriver: true,
          }),
        ]);
      }

      if (!isMounted) return;

      // Fade out the entire splash screen, then hand off
      await animateSequence([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: SCREEN_FADE_MS,
          useNativeDriver: true,
        }),
      ]);

      if (isMounted) onFinish?.();
    };

    runSequence();

    return () => { isMounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      {/* Hide status bar throughout splash on both platforms */}
      <StatusBar
        hidden
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ImageBackground
        source={SPLASH_BG}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Subtle dark overlay for text legibility */}
        <View style={styles.overlay} />

        {/* Vertically and horizontally centred greeting */}
        <View style={styles.center}>
          <Animated.Text style={[styles.greeting, { opacity: textOpacity }]}>
            {GREETINGS[greetingIdx]}
          </Animated.Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap Animated.sequence in a Promise so we can `await` it cleanly. */
function animateSequence(animations) {
  return new Promise(resolve =>
    Animated.sequence(animations).start(resolve),
  );
}

/** Simple ms-based delay Promise. */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Ensure we expand behind the status-bar cut-out on Android
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 3,
    textAlign: 'center',
    paddingHorizontal: 40,
    // Subtle drop-shadow for readability on any background
    textShadowColor: 'rgba(0, 0, 0, 0.80)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
});
