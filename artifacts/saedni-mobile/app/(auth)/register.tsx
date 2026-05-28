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

type Step = "form" | "otp";
type UserType = "customer" | "helper";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUser } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<UserType>("customer");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const top = Platform.OS === "web" ? 67 : insets.top;

  async function handleRegister() {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), userType }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("خطأ", data.error || "فشل التسجيل");
        return;
      }
      setStep("otp");
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
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

  function openWhatsApp() {
    const msg = encodeURIComponent("مرحباً، قمت بإنشاء حساب جديد في تطبيق ساعدني وأحتاج رمز التحقق");
    Linking.openURL(`https://wa.me/96892771450?text=${msg}`);
  }

  const s = makeStyles(colors, top, insets.bottom);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <View style={s.logo}>
          <Ionicons name="hand-left" size={36} color={colors.primaryForeground} />
        </View>
        <Text style={s.title}>حساب جديد</Text>
        <Text style={s.subtitle}>انضم إلى ساعدني اليوم</Text>
      </View>

      <View style={s.card}>
        {step === "form" && (
          <>
            <Text style={s.label}>نوع الحساب</Text>
            <View style={s.typeRow}>
              {(["customer", "helper"] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[s.typeCard, userType === v && s.typeCardActive]}
                  onPress={() => setUserType(v)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={v === "customer" ? "person-outline" : "hand-right-outline"}
                    size={24}
                    color={userType === v ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[s.typeLabel, userType === v && s.typeLabelActive]}>
                    {v === "customer" ? "أحتاج مساعدة" : "أريد المساعدة"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>الاسم الكامل</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="مثال: أحمد الريامي"
              textAlign="right"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={s.label}>رقم الجوال</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="96891000001"
              keyboardType="phone-pad"
              textAlign="right"
              placeholderTextColor={colors.mutedForeground}
            />

            <TouchableOpacity
              style={[s.btn, (!name.trim() || !phone.trim()) && s.btnOff]}
              onPress={handleRegister}
              disabled={loading || !name.trim() || !phone.trim()}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>إنشاء الحساب</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={s.link}>
              <Text style={s.linkTxt}>لديك حساب؟ <Text style={s.linkHighlight}>سجّل دخولك</Text></Text>
            </TouchableOpacity>
          </>
        )}

        {step === "otp" && (
          <>
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={s.successTxt}>تم إنشاء حسابك. يرجى التواصل مع الإدارة للحصول على رمز التحقق</Text>
            </View>

            <TouchableOpacity style={s.waBtn} onPress={openWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={s.waBtnTxt}>التواصل مع الإدارة عبر الواتساب</Text>
            </TouchableOpacity>

            <Text style={s.label}>رمز التحقق</Text>
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
              onPress={handleVerify}
              disabled={loading || otp.length < 4}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>تفعيل الحساب والدخول</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep("form"); setOtp(""); }} style={s.link}>
              <Text style={s.linkTxt}>تعديل البيانات</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, bottom: number) =>
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
    typeRow: { flexDirection: "row-reverse", gap: 12, marginBottom: 16 },
    typeCard: {
      flex: 1, borderWidth: 2, borderColor: c.border, borderRadius: 10,
      padding: 14, alignItems: "center", gap: 8, backgroundColor: c.background,
    },
    typeCardActive: { borderColor: c.primary, backgroundColor: c.secondary },
    typeLabel: { fontSize: 13, color: c.mutedForeground, textAlign: "center", fontWeight: "500" },
    typeLabelActive: { color: c.primary, fontWeight: "700" },
    successBanner: {
      backgroundColor: c.secondary, borderRadius: 10, padding: 14,
      flexDirection: "row-reverse", alignItems: "flex-start", gap: 10, marginBottom: 16,
    },
    successTxt: { color: c.secondaryForeground, fontSize: 13, textAlign: "right", flex: 1, lineHeight: 20 },
    waBtn: {
      backgroundColor: "#25D366", borderRadius: 10, paddingVertical: 12,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16,
    },
    waBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  });
