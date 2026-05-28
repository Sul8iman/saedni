import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

interface User {
  id: number;
  name: string;
  phone: string;
  userType: string;
  isActive: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  otpCode?: string | null;
  createdAt: string;
  area?: string | null;
}

type Filter = "all" | "customer" | "helper";

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const top = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-users", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?userType=${filter}` : "";
      const r = await fetch(`${BASE}/api/users${params}`, { credentials: "include" });
      return r.json() as Promise<User[]>;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "verify" | "block" }) => {
      const r = await fetch(`${BASE}/api/admin/helpers/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => Alert.alert("خطأ", "تعذر تحديث المستخدم"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/admin/users/${id}/delete`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => Alert.alert("خطأ", "تعذر حذف المستخدم"),
  });

  function confirmDelete(id: number, name: string) {
    Alert.alert("حذف المستخدم", `هل أنت متأكد من حذف ${name}؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  const s = makeStyles(colors, top, insets.bottom);

  const renderItem = ({ item }: { item: User }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardActions}>
          <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#EF4343" />
          </TouchableOpacity>
          {item.userType === "helper" && (
            <TouchableOpacity
              onPress={() => verifyMutation.mutate({ id: item.id, action: item.isBlocked ? "verify" : "block" })}
              hitSlop={8}
            >
              <Ionicons
                name={item.isBlocked ? "checkmark-circle-outline" : "ban-outline"}
                size={18}
                color={item.isBlocked ? colors.primary : "#EF4343"}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName}>{item.name}</Text>
          <Text style={s.userPhone}>{item.phone}</Text>
        </View>
        <View style={[s.avatar, item.userType === "helper" && s.avatarHelper]}>
          <Text style={s.avatarTxt}>{item.name?.[0] ?? "؟"}</Text>
        </View>
      </View>

      <View style={s.tagRow}>
        <View style={[s.tag, item.userType === "helper" ? s.tagHelper : s.tagCustomer]}>
          <Text style={[s.tagTxt, item.userType === "helper" ? s.tagTxtHelper : s.tagTxtCustomer]}>
            {item.userType === "helper" ? "مساعد" : item.userType === "customer" ? "عميل" : "مدير"}
          </Text>
        </View>
        {item.userType === "helper" && (
          <View style={[s.tag, item.isVerified && !item.isBlocked ? s.tagVerified : s.tagPending]}>
            <Text style={[s.tagTxt, item.isVerified && !item.isBlocked ? s.tagTxtVerified : s.tagTxtPending]}>
              {item.isBlocked ? "محظور" : item.isVerified ? "موثّق" : "قيد المراجعة"}
            </Text>
          </View>
        )}
        {item.otpCode && (
          <View style={s.otpTag}>
            <Text style={s.otpTxt}>OTP: {item.otpCode}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>المستخدمون</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-forward" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(["all", "customer", "helper"] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f === "all" ? "الكل" : f === "customer" ? "العملاء" : "المساعدون"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTxt}>لا يوجد مستخدمون</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: 12,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: c.foreground },
    filterRow: {
      flexDirection: "row-reverse", backgroundColor: c.card,
      borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    },
    filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: c.muted },
    filterTabActive: { backgroundColor: c.primary },
    filterTxt: { fontSize: 13, color: c.mutedForeground, fontWeight: "600" },
    filterTxtActive: { color: c.primaryForeground, fontWeight: "700" },
    listContent: { padding: 16, paddingBottom: bottom + 24 },
    card: { backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 },
    cardTop: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 10 },
    avatar: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: c.muted,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarHelper: { backgroundColor: c.primary },
    avatarTxt: { fontSize: 18, fontWeight: "700", color: c.primaryForeground },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: "700", color: c.foreground, textAlign: "right" },
    userPhone: { fontSize: 13, color: c.mutedForeground, textAlign: "right" },
    cardActions: { flexDirection: "column", gap: 10 },
    tagRow: { flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" },
    tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tagCustomer: { backgroundColor: "#EFF6FF" },
    tagHelper: { backgroundColor: c.secondary },
    tagVerified: { backgroundColor: c.secondary },
    tagPending: { backgroundColor: "#FEF3C7" },
    tagTxt: { fontSize: 11, fontWeight: "700" },
    tagTxtCustomer: { color: "#1D4ED8" },
    tagTxtHelper: { color: c.primary },
    tagTxtVerified: { color: c.primary },
    tagTxtPending: { color: "#92400E" },
    otpTag: { backgroundColor: "#F3F4F6", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    otpTxt: { fontSize: 11, color: "#6B7280", fontWeight: "700" },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
    emptyTxt: { fontSize: 16, color: c.mutedForeground },
  });
