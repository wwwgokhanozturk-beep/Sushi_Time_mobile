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

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const setAuth = useProfileStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
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
            <Text style={styles.backText}>{"‹ " + t("create_account")}</Text>
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
              value={name}
              onChangeText={setName}
              placeholder={t("full_name")}
              placeholderTextColor={Colors.textPrimary}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("phone_number")}
              placeholderTextColor={Colors.textPrimary}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

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
              onSubmitEditing={handleRegister}
            />
          </View>

          {/* Button */}
          <View style={styles.buttonWrap}>
            <PrimaryButton
              label={loading ? "" : t("create_account")}
              onPress={handleRegister}
              disabled={
                loading || !name.trim() || !email.trim() || !password.trim()
              }
              icon={loading ? <ActivityIndicator color="#fff" /> : null}
            />
          </View>

          {/* Sign In Link */}
          <View style={styles.signinSection}>
            <Text style={styles.linkText}>{t("already_have_account")} </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={[styles.linkText, styles.linkAccent]}>
                {t("sign_in")} &gt;
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
  signinSection: {
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
