import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

const bg = require('../../assets/mountain-bg.png');

export default function AppBackground({ children }) {
  return (
    <ImageBackground
      source={bg}
      resizeMode="cover"
      style={styles.root}
      imageStyle={styles.image}
    >
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F1EC',
  },
  image: {
    opacity: 1,
    transform: [{ translateY: -150 }, { scale: 1.08 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 250, 245, 0.12)',
  },
  content: {
    flex: 1,
  },
});
