import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

type Step = "phone" | "otp" | "pin";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [isUnverified, setIsUnverified] = useState(false);
  const [loading, setLoading] = useState(false);

  const top = Platform.OS === "web" ? 67 : insets.top;

  async function handlePhoneSubmit() {
    if (!phone.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("خطأ", data.error || "الرقم غير موجود");
        return;
      }
      if (data.isAdmin) {
        setStep("pin");
      } else {
        setIsUnverified(data.isVerified === false);
        setStep("otp");
      }
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    if (otp.length < 4) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("خطأ", data.error || "رمز التحقق غير صحيح");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setUser(data.user);
      router.replace("/");
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit() {
    if (!pin.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${BASE}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("خطأ", data.error || "رمز PIN غير صحيح");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setUser(data.user);
      router.replace("/");
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp() {
    const msg = encodeURIComponent("مرحباً، أحتاج رمز التحقق للدخول إلى تطبيق ساعدني");
    Linking.openURL(`https://wa.me/96892771450?text=${msg}`);
  }

  const s = styles(colors, top, insets.bottom);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <View style={s.logo}>
          <Ionicons name="hand-left" size={36} color={colors.primaryForeground} />
        </View>
        <Text style={s.title}>ساعدني</Text>
        <Text style={s.subtitle}>منصة المساعدة اليومية في عُمان</Text>
      </View>

      <View style={s.card}>
        {step === "phone" && (
          <>
            <Text style={s.label}>رقم الجوال</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="96891000001"
              keyboardType="phone-pad"
              textAlign="right"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <TouchableOpacity
              style={[s.btn, !phone.trim() && s.btnOff]}
              onPress={handlePhoneSubmit}
              disabled={loading || !phone.trim()}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>التالي</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={s.link}>
              <Text style={s.linkTxt}>ليس لديك حساب؟ <Text style={s.linkHighlight}>سجّل الآن</Text></Text>
            </TouchableOpacity>
          </>
        )}

        {step === "otp" && (
          <>
            {isUnverified && (
              <View style={s.warnBanner}>
                <Ionicons name="warning" size={16} color="#92400E" />
                <Text style={s.warnTxt}>حسابك غير مفعّل. أدخل رمز التحقق من الإدارة للتفعيل</Text>
              </View>
            )}
            <Text style={s.label}>رمز التحقق</Text>
            <Text style={s.hint}>
              الرقم: <Text style={s.hintBold}>{phone}</Text>
            </Text>
            <TouchableOpacity style={s.waBtn} onPress={openWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={s.waBtnTxt}>التواصل مع الإدارة عبر الواتساب</Text>
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
              style={[s.btn, otp.length < 4 && s.btnOff]}
              onPress={handleOtpSubmit}
              disabled={loading || otp.length < 4}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>تأكيد الدخول</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep("phone"); setOtp(""); }} style={s.link}>
              <Text style={s.linkTxt}>تعديل رقم الجوال</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "pin" && (
          <>
            <View style={s.adminRow}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={s.adminTxt}>دخول المدير</Text>
            </View>
            <Text style={s.label}>رمز PIN</Text>
            <TextInput
              style={[s.input, s.otpInput]}
              value={pin}
              onChangeText={t => setPin(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="• • • •"
              keyboardType="number-pad"
              secureTextEntry
              textAlign="center"
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[s.btn, !pin && s.btnOff]}
              onPress={handlePinSubmit}
              disabled={loading || !pin}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>دخول</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep("phone"); setPin(""); }} style={s.link}>
              <Text style={s.linkTxt}>تعديل رقم الجوال</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = (c: ReturnType<typeof useColors>, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { flexGrow: 1, paddingTop: top + 20, paddingBottom: bottom + 32, paddingHorizontal: 20 },
    header: { alignItems: "center", marginBottom: 32 },
    logo: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    title: { fontSize: 28, fontWeight: "700", color: c.foreground, textAlign: "center" },
    subtitle: { fontSize: 14, color: c.mutedForeground, textAlign: "center", marginTop: 4 },
    card: { backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, padding: 20 },
    label: { fontSize: 14, fontWeight: "600", color: c.foreground, textAlign: "right", marginBottom: 8 },
    hint: { fontSize: 13, color: c.mutedForeground, textAlign: "right", marginBottom: 12 },
    hintBold: { fontWeight: "700", color: c.foreground },
    input: {
      borderWidth: 1.5, borderColor: c.input, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 16, color: c.foreground, backgroundColor: c.background,
      textAlign: "right", marginBottom: 16,
    },
    otpInput: { textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: "700" },
    btn: { backgroundColor: c.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
    btnOff: { opacity: 0.4 },
    btnTxt: { color: c.primaryForeground, fontSize: 16, fontWeight: "700" },
    link: { alignItems: "center", paddingVertical: 8 },
    linkTxt: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
    linkHighlight: { color: c.primary, fontWeight: "600" },
    waBtn: {
      backgroundColor: "#25D366", borderRadius: 10, paddingVertical: 12,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16,
    },
    waBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
    warnBanner: {
      backgroundColor: "#FEF3C7", borderRadius: 8, padding: 12,
      flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 16,
    },
    warnTxt: { color: "#92400E", fontSize: 13, textAlign: "right", flex: 1 },
    adminRow: {
      flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 16,
      backgroundColor: c.secondary, borderRadius: 8, padding: 10, alignSelf: "flex-end",
    },
    adminTxt: { color: c.primary, fontWeight: "600", fontSize: 14 },
  });
