import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const isVerified = user?.isVerified ?? false;

  function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل تريد الخروج من حسابك؟", [
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

  const s = makeStyles(colors, insets.bottom);

  return (
    <View style={s.container}>
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>حسابي</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={[s.avatar, isVerified && s.avatarVerified]}>
            <Text style={s.avatarTxt}>{user?.name?.[0] ?? "؟"}</Text>
            {isVerified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
            )}
          </View>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.phone}>{user?.phone}</Text>
          <View style={s.rolePill}>
            <Ionicons name="hand-right-outline" size={14} color={colors.primary} />
            <Text style={s.roleTxt}>مساعد</Text>
          </View>
        </View>

        {/* Verification status */}
        {!isVerified && (
          <View style={s.pendingBox}>
            <Ionicons name="time-outline" size={18} color="#92400E" />
            <View style={s.pendingText}>
              <Text style={s.pendingTitle}>حسابك قيد المراجعة</Text>
              <Text style={s.pendingHint}>سيتم توثيقه من الإدارة قريباً للبدء في قبول الطلبات</Text>
            </View>
          </View>
        )}

        {/* Info card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoVal}>{user?.name}</Text>
            <Text style={s.infoKey}>الاسم</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoVal}>{user?.phone}</Text>
            <Text style={s.infoKey}>رقم الجوال</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: isVerified ? "#16A34A" : "#F59E0B" }]} />
              <Text style={s.infoVal}>{isVerified ? "موثّق" : "قيد المراجعة"}</Text>
            </View>
            <Text style={s.infoKey}>حالة التوثيق</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={s.logoutTxt}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, bottomInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerSafe: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    headerInner: { paddingHorizontal: 20, paddingVertical: 14 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: c.foreground, textAlign: "right" },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: bottomInset + 100, alignItems: "center" },
    avatarSection: { alignItems: "center", paddingVertical: 28 },
    avatar: {
      width: 92, height: 92, borderRadius: 46,
      backgroundColor: c.muted, borderWidth: 3, borderColor: c.border,
      alignItems: "center", justifyContent: "center", marginBottom: 14,
    },
    avatarVerified: {
      backgroundColor: c.primary, borderColor: c.primary,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    avatarTxt: { fontSize: 38, fontWeight: "800", color: c.primaryForeground },
    verifiedBadge: {
      position: "absolute", bottom: -2, right: -2,
      backgroundColor: c.card, borderRadius: 12,
    },
    name: { fontSize: 24, fontWeight: "800", color: c.foreground, marginBottom: 4 },
    phone: { fontSize: 15, color: c.mutedForeground, marginBottom: 12 },
    rolePill: {
      flexDirection: "row-reverse", alignItems: "center", gap: 6,
      backgroundColor: c.secondary, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 7,
    },
    roleTxt: { fontSize: 14, color: c.primary, fontWeight: "700" },
    pendingBox: {
      width: "100%", backgroundColor: "#FEF3C7", borderRadius: 14, padding: 14,
      flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 16,
      borderWidth: 1, borderColor: "#FDE68A",
    },
    pendingText: { flex: 1 },
    pendingTitle: { fontSize: 14, fontWeight: "700", color: "#92400E", textAlign: "right", marginBottom: 2 },
    pendingHint: { fontSize: 13, color: "#92400E", textAlign: "right", lineHeight: 18 },
    infoCard: {
      width: "100%", backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 20,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    infoRow: {
      flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 18, paddingVertical: 16,
    },
    infoKey: { fontSize: 14, color: c.mutedForeground, fontWeight: "500" },
    infoVal: { fontSize: 15, fontWeight: "600", color: c.foreground },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 18 },
    statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    logoutBtn: {
      width: "100%", flexDirection: "row-reverse", alignItems: "center", gap: 12,
      backgroundColor: "#FEF2F2", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
      borderWidth: 1, borderColor: "#FECACA",
    },
    logoutTxt: { fontSize: 16, color: "#DC2626", fontWeight: "700" },
  });
