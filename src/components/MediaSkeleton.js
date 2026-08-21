import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radius } from '../core/theme';

// logo.jpg — JPEG с запечённой «шахматкой», поэтому берём вырезанную версию.
const LOGO = require('../../assets/logo-mark.png');

// Заглушка для баннера, пока видео/фото ещё не готово к показу.
// Раньше здесь был просто белый прямоугольник — именно он читался как
// «приложение зависло». Фирменный шиммер с логотипом выглядит как загрузка.
export default function MediaSkeleton({ style, showLogo = true, radius = Radius.xl }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  return (
    <View style={[styles.base, { borderRadius: radius }, style]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.sheen, { opacity }]} />
      {showLogo && (
        <Animated.View style={[styles.logoWrap, { opacity }]}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" cachePolicy="memory-disk" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheen: {
    backgroundColor: Colors.shimmerHighlight,
  },
  logoWrap: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 108,
    height: 53,
  },
});
