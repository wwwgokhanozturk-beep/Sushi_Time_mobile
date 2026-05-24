import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Colors, Radius, Spacing } from "../core/theme";
import { PrimaryButton } from "../components/SharedWidgets";
import { useProfileStore } from "../store/profileStore";
import httpClient from "../core/httpClient";

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const setAuth = useProfileStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const { data } = await httpClient.post("/users/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const res = data.data || data;
      await setAuth(res.user, res.token, res.refreshToken);
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || t("login_error");
      Alert.alert(t("sign_in"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ImageBackground
        source={require("../../assets/mountain-bg.png")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Red Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonArea}
          >
            <Text style={styles.backText}>{"‹ " + t("sign_in")}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Title */}
          <View style={styles.logoSection}>
            <Text style={styles.appName}>sushi</Text>
            <Text style={[styles.appName, styles.appNameAccent]}>time</Text>
          </View>

          {/* Inputs */}
          <View style={styles.formSection}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("email_address")}
              placeholderTextColor={Colors.textPrimary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <TextInput
              style={[styles.input, { marginBottom: Spacing.lg }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t("password")}
              placeholderTextColor={Colors.textPrimary}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Button */}
          <View style={styles.buttonWrap}>
            <PrimaryButton
              label={loading ? "" : t("sign_in")}
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              icon={loading ? <ActivityIndicator color="#fff" /> : null}
            />
          </View>

          {/* Forgot Password / Guest */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.forgotText}>{t("continue_as_guest")}</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupSection}>
            <Text style={styles.linkText}>{t("no_account_yet")} </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={[styles.linkText, styles.linkAccent]}>
                {t("create_account")} &gt;
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: {
    flex: 1,
  },
  header: {
    backgroundColor: "#EF4444",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Platform.OS === "ios" ? Spacing.xl : Spacing.lg,
  },
  backButtonArea: {
    marginLeft: -Spacing.lg,
  },
  backText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  appName: {
    fontSize: 40,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  appNameAccent: {
    color: "#EF4444",
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  input: {
    height: 58,
    borderRadius: Radius.md,
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "#BDBDBD",
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  buttonWrap: {
    width: 250,
    alignSelf: "center",
    marginTop: Spacing.md,
  },
  guestButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  forgotText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  signupSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: Spacing.xl,
  },
  linkText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  linkAccent: {
    color: "#EF4444",
    fontWeight: "700",
  },
});
