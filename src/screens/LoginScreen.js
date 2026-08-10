import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors, Spacing } from "../core/theme";
import { PrimaryButton } from "../components/SharedWidgets";
import AuthBackground, { AuthInput } from "../components/AuthBackground";
import { useProfileStore } from "../store/profileStore";
import httpClient from "../core/httpClient";

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const setAuth = useProfileStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() && password.trim();

  const handleLogin = async () => {
    if (!canSubmit) return;
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
    <AuthBackground
      title={t("sign_in")}
      subtitle={t("welcome_back", { defaultValue: "Welcome back 🍣" })}
      onBack={() => navigation.goBack()}
    >
      <AuthInput
        value={email}
        onChangeText={setEmail}
        placeholder={t("email_address")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />

      <AuthInput
        value={password}
        onChangeText={setPassword}
        placeholder={t("password")}
        secure
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <View style={styles.buttonWrap}>
        <PrimaryButton
          label={t("sign_in")}
          onPress={handleLogin}
          loading={loading}
          disabled={!canSubmit}
        />
      </View>

      <TouchableOpacity
        style={styles.guestButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.guestText}>{t("continue_as_guest")}</Text>
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <Text style={styles.linkText}>{t("no_account_yet")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")} activeOpacity={0.7}>
          <Text style={[styles.linkText, styles.linkAccent]}>{t("create_account")} ›</Text>
        </TouchableOpacity>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  buttonWrap: { marginTop: Spacing.sm },
  guestButton: { marginTop: Spacing.md, alignItems: "center" },
  guestText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "600" },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: Spacing.lg,
  },
  linkText: { color: Colors.textPrimary, fontSize: 15, fontWeight: "600" },
  linkAccent: { color: Colors.primary, fontWeight: "800" },
});
