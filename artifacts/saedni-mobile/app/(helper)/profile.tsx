import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function HelperProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const top = Platform.OS === "web" ? 67 : insets.top;

  function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج", style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/");
        },
      },
    ]);
  }

  const s = makeStyles(colors, top, insets.bottom);
  const isVerified = user?.isVerified ?? false;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>حسابي</Text>
      </View>
      <View style={s.content}>
        <View style={[s.avatar, isVerified && s.avatarVerified]}>
          <Text style={s.avatarTxt}>{user?.name?.[0] ?? "؟"}</Text>
        </View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.phone}>{user?.phone}</Text>
        <View style={s.typeBadge}>
          <Ionicons name="hand-right-outline" size={14} color={colors.primary} />
          <Text style={s.typeTxt}>مساعد</Text>
          {isVerified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={s.verifiedTxt}>موثّق</Text>
            </View>
          )}
        </View>

        {!isVerified && (
          <View style={s.unverifiedBanner}>
            <Ionicons name="time-outline" size={16} color="#92400E" />
            <Text style={s.unverifiedTxt}>حسابك قيد المراجعة. سيتم توثيقه من الإدارة قريباً</Text>
          </View>
        )}

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoVal}>{user?.phone}</Text>
            <Text style={s.infoKey}>رقم الجوال</Text>
          </View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={s.infoVal}>{isVerified ? "موثّق" : "قيد المراجعة"}</Text>
            <Text style={s.infoKey}>حالة التوثيق</Text>
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4343" />
          <Text style={s.logoutTxt}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: c.foreground, textAlign: "right" },
    content: { flex: 1, alignItems: "center", padding: 24, paddingBottom: bottom + 80 },
    avatar: {
      width: 88, height: 88, borderRadius: 44, backgroundColor: c.muted,
      alignItems: "center", justifyContent: "center", marginTop: 24, marginBottom: 12,
      borderWidth: 3, borderColor: c.border,
    },
    avatarVerified: { backgroundColor: c.primary, borderColor: c.primary },
    avatarTxt: { fontSize: 36, fontWeight: "700", color: c.primaryForeground },
    name: { fontSize: 22, fontWeight: "700", color: c.foreground, marginBottom: 4 },
    phone: { fontSize: 14, color: c.mutedForeground, marginBottom: 12 },
    typeBadge: {
      flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: c.secondary,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
    },
    typeTxt: { fontSize: 13, color: c.primary, fontWeight: "600" },
    verifiedBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
    verifiedTxt: { fontSize: 12, color: c.primary, fontWeight: "600" },
    unverifiedBanner: {
      backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12,
      flexDirection: "row-reverse", alignItems: "center", gap: 8, width: "100%", marginBottom: 16,
    },
    unverifiedTxt: { color: "#92400E", fontSize: 13, textAlign: "right", flex: 1, lineHeight: 18 },
    infoCard: {
      width: "100%", backgroundColor: c.card, borderRadius: c.radius,
      borderWidth: 1, borderColor: c.border, marginBottom: 24,
    },
    infoRow: {
      flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    infoKey: { fontSize: 14, color: c.mutedForeground },
    infoVal: { fontSize: 14, fontWeight: "600", color: c.foreground },
    logoutBtn: {
      flexDirection: "row-reverse", alignItems: "center", gap: 10, width: "100%",
      backgroundColor: "#FEE2E2", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    },
    logoutTxt: { fontSize: 16, color: "#DC2626", fontWeight: "700" },
  });
