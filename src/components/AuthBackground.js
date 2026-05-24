import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Platform,
} from "react-native";
import { Colors, Spacing } from "../core/theme";
import MOUNT from "../../assets/mountain-bg.png"; // Rasmni assets papkasiga qo'ying
const AuthBackground = ({ title, onBack, children }) => {
  return (
    <View style={styles.container}>
      {/* Mountain Background Image */}
      <ImageBackground
        source={MOUNT} // rasmni assets papkasiga qo'ying
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Red Header with Title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹ {title}</Text>
          </TouchableOpacity>
        </View>

        {/* Content Wrapper */}
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentWrapper}>{children}</View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  backgroundImage: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    backgroundColor: "#EF4444", // Sushi Time qizil rangi
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === "ios" ? Spacing.xl : Spacing.lg,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
  },
  contentWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
});

export default AuthBackground;
