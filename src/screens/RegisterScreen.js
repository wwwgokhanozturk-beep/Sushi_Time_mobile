import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors, Spacing } from "../core/theme";
import { PrimaryButton } from "../components/SharedWidgets";
import AuthBackground, { AuthInput } from "../components/AuthBackground";
import { useProfileStore } from "../store/profileStore";
import httpClient from "../core/httpClient";

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const setAuth = useProfileStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim() && email.trim() && password.trim();

  const handleRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await httpClient.post("/users/register", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      const { data } = await httpClient.post("/users/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const res = data.data || data;
      await setAuth(res.user, res.token, res.refreshToken);
      navigation.navigate("Tabs");
    } catch (err) {
      const msg = err.response?.data?.message || t("register_error");
      Alert.alert(t("create_account"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground
      title={t("create_account")}
      subtitle={t("register_subtitle", { defaultValue: "Join Sushi Time in seconds" })}
      onBack={() => navigation.goBack()}
    >
      <AuthInput
        value={name}
        onChangeText={setName}
        placeholder={t("full_name")}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <AuthInput
        value={phone}
        onChangeText={setPhone}
        placeholder={t("phone_number")}
        keyboardType="phone-pad"
        returnKeyType="next"
      />

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
        onSubmitEditing={handleRegister}
      />

      <View style={styles.buttonWrap}>
        <PrimaryButton
          label={t("create_account")}
          onPress={handleRegister}
          loading={loading}
          disabled={!canSubmit}
        />
      </View>

      <View style={styles.linkRow}>
        <Text style={styles.linkText}>{t("already_have_account")} </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.7}>
          <Text style={[styles.linkText, styles.linkAccent]}>{t("sign_in")} ›</Text>
        </TouchableOpacity>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  buttonWrap: { marginTop: Spacing.sm },
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
