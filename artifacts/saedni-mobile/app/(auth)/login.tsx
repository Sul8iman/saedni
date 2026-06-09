import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

type Step = "phone" | "otp" | "pin";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

console.log("[saedni] EXPO_PUBLIC_DOMAIN =", process.env.EXPO_PUBLIC_DOMAIN ?? "(not set)");
console.log("[saedni] BASE =", BASE || "(empty — all fetches will fail on native)");

async function safeFetch(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* non-JSON body */ }
  return { res, data };
}

function debugAlert(title: string, url: string, status: number | null, errMsg: string) {
  const lines = [errMsg, `\nURL: ${url || "(empty — domain not set)"}`];
  if (status !== null) lines.push(`Status: ${status}`);
  Alert.alert(title, lines.join("\n"));
}

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [isUnverified, setIsUnverified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePhoneSubmit() {
    if (!phone.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const loginUrl = `${BASE}/api/auth/login`;
    console.log("[saedni] handlePhoneSubmit →", loginUrl);
    try {
      const { res, data } = await safeFetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        debugAlert("خطأ", loginUrl, res.status, (data.error as string) || "رقم غير موجود");
        return;
      }
      if (data.isAdmin) { setStep("pin"); }
      else { setIsUnverified(data.isVerified === false); setStep("otp"); }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      debugAlert("خطأ في الاتصال", loginUrl, null, `تعذر الاتصال بالخادم\n${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    if (otp.length < 4) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const otpUrl = `${BASE}/api/auth/verify-otp`;
    console.log("[saedni] handleOtpSubmit →", otpUrl);
    try {
      const { res, data } = await safeFetch(otpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), otp }),
      });
      if (!res.ok) {
        debugAlert("خطأ", otpUrl, res.status, (data.error as string) || "رمز التحقق غير صحيح");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const token = data.token as string | undefined;
      const user  = data.user  as AuthUser | undefined;
      console.log("[saedni] OTP verify OK — token:", token ? token.substring(0, 8) + "…" : "MISSING", "user:", user?.name);
      if (!token || !user) {
        Alert.alert("خطأ", `الخادم لم يُرجع رمز الدخول\nالاستجابة: ${JSON.stringify(data).substring(0, 120)}`);
        return;
      }
      const saveResult = await setSession(user, token);
      if (!saveResult) return; // setSession already alerted
      Alert.alert(
        "✅ تم تسجيل الدخول",
        `Token: ${token.substring(0, 8)}…\n` +
        `SecureStore: ${saveResult.ssWrite ? (saveResult.ssRead ? "✅ saved+verified" : "⚠️ wrote/no-readback") : "❌ failed"}\n` +
        `AsyncStorage: ${saveResult.asWrite ? (saveResult.asRead ? "✅ saved+verified" : "⚠️ wrote/no-readback") : "❌ failed"}`,
        [{ text: "متابعة", onPress: () => router.replace("/") }],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      debugAlert("خطأ في الاتصال", otpUrl, null, `تعذر الاتصال بالخادم\n${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit() {
    if (!pin.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const adminUrl = `${BASE}/api/auth/admin-login`;
    console.log("[saedni] handlePinSubmit →", adminUrl);
    try {
      const { res, data } = await safeFetch(adminUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), pin }),
      });
      if (!res.ok) {
        debugAlert("خطأ", adminUrl, res.status, (data.error as string) || "رمز PIN غير صحيح");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const token = data.token as string | undefined;
      const user  = data.user  as AuthUser | undefined;
      console.log("[saedni] Admin login OK — token:", token ? token.substring(0, 8) + "…" : "MISSING", "user:", user?.name);
      if (!token || !user) {
        Alert.alert("خطأ", `الخادم لم يُرجع رمز الدخول\nالاستجابة: ${JSON.stringify(data).substring(0, 120)}`);
        return;
      }
      const saveResult = await setSession(user, token);
      if (!saveResult) return;
      Alert.alert(
        "✅ تم تسجيل الدخول",
        `Token: ${token.substring(0, 8)}…\n` +
        `SecureStore: ${saveResult.ssWrite ? (saveResult.ssRead ? "✅ saved+verified" : "⚠️ wrote/no-readback") : "❌ failed"}\n` +
        `AsyncStorage: ${saveResult.asWrite ? (saveResult.asRead ? "✅ saved+verified" : "⚠️ wrote/no-readback") : "❌ failed"}`,
        [{ text: "متابعة", onPress: () => router.replace("/") }],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      debugAlert("خطأ في الاتصال", adminUrl, null, `تعذر الاتصال بالخادم\n${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp() {
    Linking.openURL(
      `https://wa.me/96892771450?text=${encodeURIComponent("مرحباً، أحتاج رمز التحقق للدخول إلى تطبيق ساعدني")}`
    );
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAwareScrollViewCompat
        style={s.scroll}
        contentContainerStyle={s.content}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Ionicons name="hand-left" size={38} color={colors.primaryForeground} />
          </View>
          <Text style={s.appName}>ساعدني</Text>
          <Text style={s.tagline}>منصة المساعدة اليومية في عُمان</Text>
          {/* DEBUG BANNER — remove after domain is confirmed */}
          <Text style={s.debugBanner}>
            {BASE ? `🔗 ${BASE}` : "⚠️ DOMAIN NOT SET"}
          </Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          {step === "phone" && (
            <>
              <Text style={s.cardTitle}>تسجيل الدخول</Text>
              <Text style={s.fieldLabel}>رقم الهاتف</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="96891000001"
                keyboardType="phone-pad"
                textAlign="right"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handlePhoneSubmit}
              />
              <TouchableOpacity
                style={[s.primaryBtn, !phone.trim() && s.btnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={loading || !phone.trim()}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.primaryBtnTxt}>التالي</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={s.ghostBtn}>
                <Text style={s.ghostTxt}>
                  ليس لديك حساب؟{" "}
                  <Text style={s.ghostLink}>سجّل الآن</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={s.cardTitle}>رمز التحقق</Text>
              {isUnverified && (
                <View style={s.warnBox}>
                  <Ionicons name="warning-outline" size={16} color="#92400E" />
                  <Text style={s.warnTxt}>حسابك غير مفعّل — أدخل رمز التحقق من الإدارة</Text>
                </View>
              )}
              <Text style={s.subLabel}>
                الرقم: <Text style={s.subLabelBold}>{phone}</Text>
              </Text>
              <Text style={s.adminHint}>رمز التحقق متوفر لدى الإدارة</Text>
              <TouchableOpacity style={s.waBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={s.waBtnTxt}>تواصل مع الإدارة</Text>
              </TouchableOpacity>
              <TextInput
                style={[s.input, s.otpInput]}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, "").slice(0, 4))}
                placeholder="- - - -"
                keyboardType="number-pad"
                maxLength={4}
                textAlign="center"
                placeholderTextColor={colors.mutedForeground}
              />
              <TouchableOpacity
                style={[s.primaryBtn, otp.length < 4 && s.btnDisabled]}
                onPress={handleOtpSubmit}
                disabled={loading || otp.length < 4}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.primaryBtnTxt}>تأكيد الدخول</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep("phone"); setOtp(""); }} style={s.ghostBtn}>
                <Text style={[s.ghostTxt, { color: colors.mutedForeground }]}>تعديل رقم الهاتف</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "pin" && (
            <>
              <View style={s.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={s.adminBadgeTxt}>دخول المدير</Text>
              </View>
              <Text style={s.fieldLabel}>رمز PIN</Text>
              <TextInput
                style={[s.input, s.otpInput]}
                value={pin}
                onChangeText={t => setPin(t.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • •"
                keyboardType="number-pad"
                secureTextEntry
                textAlign="center"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={handlePinSubmit}
              />
              <TouchableOpacity
                style={[s.primaryBtn, !pin && s.btnDisabled]}
                onPress={handlePinSubmit}
                disabled={loading || !pin}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.primaryBtnTxt}>دخول</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep("phone"); setPin(""); }} style={s.ghostBtn}>
                <Text style={[s.ghostTxt, { color: colors.mutedForeground }]}>تعديل رقم الهاتف</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 },
    logoSection: { alignItems: "center", marginBottom: 36 },
    logoCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
      marginBottom: 16,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    appName: { fontSize: 32, fontWeight: "800", color: c.foreground, letterSpacing: -0.5 },
    tagline: { fontSize: 14, color: c.mutedForeground, marginTop: 6, textAlign: "center" },
    debugBanner: {
      fontSize: 10, color: "#888", marginTop: 6, textAlign: "center",
      fontFamily: "monospace",
    },
    card: {
      backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border,
      padding: 24,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    cardTitle: {
      fontSize: 20, fontWeight: "700", color: c.foreground,
      textAlign: "right", marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 14, fontWeight: "600", color: c.foreground,
      textAlign: "right", marginBottom: 8,
    },
    subLabel: { fontSize: 13, color: c.mutedForeground, textAlign: "right", marginBottom: 16 },
    subLabelBold: { fontWeight: "700", color: c.foreground },
    input: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 16, color: c.foreground, backgroundColor: c.background,
      textAlign: "right", marginBottom: 16,
    },
    otpInput: {
      textAlign: "center", fontSize: 28, letterSpacing: 10, fontWeight: "800",
      paddingVertical: 18,
    },
    primaryBtn: {
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 16,
      alignItems: "center", marginBottom: 12,
    },
    btnDisabled: { opacity: 0.4 },
    primaryBtnTxt: { color: c.primaryForeground, fontSize: 16, fontWeight: "700" },
    ghostBtn: { alignItems: "center", paddingVertical: 10 },
    ghostTxt: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
    ghostLink: { color: c.primary, fontWeight: "700" },
    adminHint: {
      fontSize: 13, color: c.mutedForeground, textAlign: "center",
      marginBottom: 12, lineHeight: 20,
    },
    waBtn: {
      backgroundColor: "#25D366", borderRadius: 12, paddingVertical: 13,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center",
      gap: 10, marginBottom: 16,
    },
    waBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
    warnBox: {
      backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12,
      flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, marginBottom: 16,
    },
    warnTxt: { color: "#92400E", fontSize: 13, textAlign: "right", flex: 1, lineHeight: 18 },
    adminBadge: {
      flexDirection: "row-reverse", alignItems: "center", gap: 6,
      backgroundColor: c.secondary, borderRadius: 10, padding: 10,
      alignSelf: "flex-end", marginBottom: 16,
    },
    adminBadgeTxt: { color: c.primary, fontWeight: "700", fontSize: 13 },
  });
