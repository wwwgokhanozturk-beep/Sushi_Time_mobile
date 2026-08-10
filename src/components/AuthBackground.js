import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, Radius, Shadows } from "../core/theme";

const MOUNT = require("../../assets/mountain-bg.png");

/**
 * Shared auth layout: mountain background + soft scrim, safe-area aware,
 * floating back button, brand logo, and a translucent form card.
 *
 * Props:
 *   title    — card heading (e.g. "Sign In")
 *   subtitle — optional muted line under the title
 *   onBack   — back button handler
 *   children — form fields / buttons / links
 */
export default function AuthBackground({ title, subtitle, onBack, children }) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={MOUNT} resizeMode="cover" style={styles.bg}>
      {/* Soft veil so the sketch stays visible but the form reads clearly */}
      <View style={styles.scrim} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand logo */}
          <View style={styles.logo}>
            <Text style={styles.logoText}>sushi</Text>
            <Text style={[styles.logoText, styles.logoAccent]}>time</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating back button — last child so it stays on top & tappable */}
      <TouchableOpacity
        onPress={onBack}
        style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Text style={styles.backChevron}>‹</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}

/**
 * Themed text input with a proper muted placeholder and an optional
 * show/hide toggle for password fields.
 */
export function AuthInput({ secure, style, ...rest }) {
  const [hidden, setHidden] = useState(true);
  const isSecure = !!secure;

  return (
    <View style={[styles.inputWrap, style]}>
      <TextInput
        style={styles.input}
        placeholderTextColor={Colors.textLight}
        secureTextEntry={isSecure && hidden}
        {...rest}
      />
      {isSecure && (
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setHidden((h) => !h)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.eyeText}>{hidden ? "👁" : "🙈"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: "#F4F1EC" },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,250,245,0.45)",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },

  // ── Back button ──
  backBtn: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.sm,
  },
  backChevron: {
    color: Colors.primary,
    fontSize: 30,
    fontWeight: "800",
    marginTop: -4,
  },

  // ── Logo ──
  logo: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: 38,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  logoAccent: { color: Colors.primary },

  // ── Card ──
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  form: { marginTop: Spacing.lg },

  // ── Input ──
  inputWrap: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  input: {
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1.5,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingRight: 48,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeText: { fontSize: 18 },
});
